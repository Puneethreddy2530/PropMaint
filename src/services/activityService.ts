import prisma from "@/lib/prisma";
import crypto from "crypto";
import { ActivityAction, NotificationType, Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";

export interface LogActivityParams {
  ticketId: string;
  performedById: string;
  action: ActivityAction;
  description: string;
  previousValue?: string;
  newValue?: string;
  metadata?: Record<string, unknown>;
}

interface CreateNotificationParams {
  userId: string;
  ticketId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

function generateLogHash(previousHash: string | null, newData: Record<string, unknown>) {
  const dataString = JSON.stringify({ prev: previousHash, data: newData });
  return crypto.createHash("sha256").update(dataString).digest("hex");
}

/**
 * Log an activity to a ticket's audit trail
 */
export async function logActivity(
  params: LogActivityParams,
  tx?: Prisma.TransactionClient
) {
  const db = tx ?? prisma;

  const lastLog = await db.activityLog.findFirst({
    where: { ticketId: params.ticketId },
    orderBy: { createdAt: "desc" },
  });

  const previousHash = lastLog?.hash || null;
  const newHash = generateLogHash(previousHash, {
    ticketId: params.ticketId,
    userId: params.performedById,
    action: params.action,
    description: params.description,
    previousValue: params.previousValue,
    newValue: params.newValue,
    metadata: params.metadata,
  });

  return db.activityLog.create({
    data: {
      ticketId: params.ticketId,
      performedById: params.performedById,
      action: params.action,
      description: params.description,
      previousValue: params.previousValue || null,
      newValue: params.newValue || null,
      metadata: params.metadata ? (params.metadata as Prisma.InputJsonValue) : undefined,
      hash: newHash,
    },
  });
}

async function createNotification(
  params: CreateNotificationParams,
  tx?: Prisma.TransactionClient
) {
  const db = tx ?? prisma;
  return db.notification.create({
    data: {
      userId: params.userId,
      ticketId: params.ticketId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link || `/tickets/${params.ticketId}`,
    },
  });
}

/**
 * Notify relevant users based on ticket action
 */
export async function notifyOnTicketAction(
  ticketId: string,
  action: "created" | "assigned" | "status_changed" | "commented",
  actorId: string,
  extra?: { assigneeId?: string; newStatus?: string; ticketTitle?: string },
  tx?: Prisma.TransactionClient
) {
  const db = tx ?? prisma;
  const ticket = await db.ticket.findFirst({
    where: { id: ticketId, deletedAt: null },
    include: {
      createdBy: true,
      assignedTo: true,
      property: { include: { manager: true } },
    },
  });

  if (!ticket) {
    throw new AppError("NOT_FOUND", "Ticket not found", 404);
  }

  const title = extra?.ticketTitle || ticket.title;
  const notifications: CreateNotificationParams[] = [];

  switch (action) {
    case "created":
      if (ticket.property.managerId && ticket.property.managerId !== actorId) {
        notifications.push({
          userId: ticket.property.managerId,
          ticketId,
          type: NotificationType.TICKET_CREATED,
          title: "New Maintenance Request",
          message: `New request: "${title}" submitted for ${ticket.property.name}`,
        });
      }
      break;
    case "assigned":
      if (extra?.assigneeId && extra.assigneeId !== actorId) {
        notifications.push({
          userId: extra.assigneeId,
          ticketId,
          type: NotificationType.TICKET_ASSIGNED,
          title: "New Assignment",
          message: `You've been assigned to: "${title}"`,
        });
      }
      break;
    case "status_changed":
      if (ticket.createdById !== actorId) {
        notifications.push({
          userId: ticket.createdById,
          ticketId,
          type: NotificationType.STATUS_UPDATE,
          title: "Request Updated",
          message: `Your request "${title}" is now ${extra?.newStatus?.replace("_", " ").toLowerCase()}`,
        });
      }
      if (
        extra?.newStatus === "COMPLETED" &&
        ticket.property.managerId &&
        ticket.property.managerId !== actorId
      ) {
        notifications.push({
          userId: ticket.property.managerId,
          ticketId,
          type: NotificationType.STATUS_UPDATE,
          title: "Work Completed",
          message: `"${title}" has been marked as completed and needs verification`,
        });
      }
      break;
    case "commented": {
      const usersToNotify = new Set<string>();
      if (ticket.createdById !== actorId) usersToNotify.add(ticket.createdById);
      if (ticket.assignedToId && ticket.assignedToId !== actorId) usersToNotify.add(ticket.assignedToId);
      if (ticket.property.managerId && ticket.property.managerId !== actorId) usersToNotify.add(ticket.property.managerId);

      usersToNotify.forEach((userId) => {
        notifications.push({
          userId,
          ticketId,
          type: NotificationType.COMMENT_ADDED,
          title: "New Comment",
          message: `New comment on "${title}"`,
        });
      });
      break;
    }
  }

  if (notifications.length > 0) {
    await db.notification.createMany({
      data: notifications.map((n) => ({
        userId: n.userId,
        ticketId: n.ticketId,
        type: n.type,
        title: n.title,
        message: n.message,
        link: `/tickets/${ticketId}`,
      })),
    });
  }

  return notifications;
}
