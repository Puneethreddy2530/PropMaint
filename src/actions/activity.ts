"use server";

import prisma from "@/lib/prisma";
import crypto from "crypto";
import { ActivityAction, NotificationType, Prisma } from "@prisma/client";

interface LogActivityParams {
  ticketId: string;
  performedById: string;
  action: ActivityAction;
  description: string;
  previousValue?: string;
  newValue?: string;
  metadata?: Record<string, unknown>;
}

// A helper function to hash the previous log entry with the new one
function generateLogHash(previousHash: string | null, newData: any) {
  const dataString = JSON.stringify({ prev: previousHash, data: newData });
  return crypto.createHash("sha256").update(dataString).digest("hex");
}

/**
 * Log an activity to a ticket's audit trail
 */
export async function logActivity(params: LogActivityParams) {
  // 1. Get the most recent log for this ticket
  const lastLog = await prisma.activityLog.findFirst({
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

  // 2. Create the new tamper-proof log
  return prisma.activityLog.create({
    data: {
      ticketId: params.ticketId,
      performedById: params.performedById,
      action: params.action,
      description: params.description,
      previousValue: params.previousValue || null,
      newValue: params.newValue || null,
      metadata: params.metadata ? (params.metadata as Prisma.InputJsonValue) : undefined,
      hash: newHash, // The new chained hash
    },
  });
}

interface CreateNotificationParams {
  userId: string;
  ticketId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

/**
 * Create an in-app notification for a user
 */
export async function createNotification(params: CreateNotificationParams) {
  return prisma.notification.create({
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
  extra?: { assigneeId?: string; newStatus?: string; ticketTitle?: string }
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      createdBy: true,
      assignedTo: true,
      property: { include: { manager: true } },
    },
  });

  if (!ticket) return;

  const title = extra?.ticketTitle || ticket.title;
  const notifications: CreateNotificationParams[] = [];

  switch (action) {
    case "created":
      // Notify property manager
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
      // Notify the assigned technician
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
      // Notify tenant of status changes
      if (ticket.createdById !== actorId) {
        notifications.push({
          userId: ticket.createdById,
          ticketId,
          type: NotificationType.STATUS_UPDATE,
          title: "Request Updated",
          message: `Your request "${title}" is now ${extra?.newStatus?.replace("_", " ").toLowerCase()}`,
        });
      }
      // Notify manager if staff completed
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

    case "commented":
      // Notify all parties except the commenter
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

  // Batch create all notifications
  if (notifications.length > 0) {
    await prisma.notification.createMany({
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
}
