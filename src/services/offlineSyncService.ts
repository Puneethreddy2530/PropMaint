import prisma from "@/lib/prisma";
import { AppError, toErrorResponse } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { buildStatusTimestamps, isTransitionAllowed } from "@/lib/ticketWorkflow";
import { logActivity, notifyOnTicketAction } from "./activityService";
import type { SessionUser } from "./ticketService";
import { ActivityAction, TicketStatus } from "@prisma/client";
import type { OfflineMutation, OfflineSyncResult } from "@/types/offline";

export async function processOfflineMutations(
  mutations: OfflineMutation[],
  actor: SessionUser
): Promise<OfflineSyncResult[]> {
  if (!hasPermission(actor.role, "ticket:update:status")) {
    throw new AppError("FORBIDDEN", "Only staff and managers can update ticket status.", 403);
  }

  const results: OfflineSyncResult[] = [];

  for (const mutation of mutations) {
    try {
      const { ticketId, status, resolution, expectedVersion } = mutation.payload;

      if (status !== TicketStatus.IN_PROGRESS) {
        throw new AppError("BAD_REQUEST", "Only IN_PROGRESS can be queued offline.", 400);
      }

      await prisma.$transaction(async (tx) => {
        const ticket = await tx.ticket.findFirst({
          where: { id: ticketId, deletedAt: null },
        });

        if (!ticket) throw new AppError("NOT_FOUND", "Ticket not found", 404);

        if (actor.role === "STAFF" && ticket.assignedToId !== actor.id) {
          throw new AppError("FORBIDDEN", "Ticket is not assigned to you", 403);
        }

        if (!isTransitionAllowed(ticket.status, status)) {
          throw new AppError(
            "BAD_REQUEST",
            `Invalid status transition from ${ticket.status.replace("_", " ")} to ${status.replace("_", " ")}`,
            400
          );
        }

        if (typeof expectedVersion === "number" && ticket.version !== expectedVersion) {
          throw new AppError("CONFLICT", "Ticket was updated while offline. Please refresh.", 409);
        }

        const now = new Date();
        const timestamps = buildStatusTimestamps(status, now);
        const slaBroken =
          ticket.slaDeadline && now > ticket.slaDeadline && !ticket.completedAt;

        const updated = await tx.ticket.updateMany({
          where: { id: ticketId, version: ticket.version, deletedAt: null },
          data: {
            status,
            resolution: resolution || ticket.resolution,
            slaBroken: slaBroken || ticket.slaBroken,
            version: { increment: 1 },
            ...timestamps,
          },
        });

        if (updated.count === 0) {
          throw new AppError(
            "CONFLICT",
            "Ticket was updated by another user. Please refresh.",
            409
          );
        }

        await logActivity(
          {
            ticketId,
            performedById: actor.id,
            action: ActivityAction.STATUS_CHANGED,
            description: `${actor.name} changed status from ${ticket.status.replace("_", " ")} to ${status.replace("_", " ")}`,
            previousValue: ticket.status,
            newValue: status,
          },
          tx
        );

        await notifyOnTicketAction(
          ticketId,
          "status_changed",
          actor.id,
          { newStatus: status },
          tx
        );
      });

      results.push({ id: mutation.id, ok: true });
    } catch (err) {
      results.push({ id: mutation.id, ok: false, error: toErrorResponse(err) });
    }
  }

  return results;
}
