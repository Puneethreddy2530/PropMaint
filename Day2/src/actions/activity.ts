"use server";

import prisma from "@/lib/prisma";
import { ActivityAction, NotificationType } from "@prisma/client";

export async function logActivity(params: {
  ticketId: string; performedById: string; action: ActivityAction;
  description: string; previousValue?: string; newValue?: string; metadata?: Record<string, unknown>;
}) {
  return prisma.activityLog.create({
    data: {
      ticketId: params.ticketId, performedById: params.performedById,
      action: params.action, description: params.description,
      previousValue: params.previousValue || null, newValue: params.newValue || null,
      metadata: params.metadata || null,
    },
  });
}

export async function notifyOnTicketAction(
  ticketId: string, action: "created" | "assigned" | "status_changed" | "commented",
  actorId: string, extra?: { assigneeId?: string; newStatus?: string; ticketTitle?: string }
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { createdBy: true, assignedTo: true, property: { include: { manager: true } } },
  });
  if (!ticket) return;

  const title = extra?.ticketTitle || ticket.title;
  const notifs: { userId: string; ticketId: string; type: NotificationType; title: string; message: string }[] = [];

  if (action === "created" && ticket.property.managerId && ticket.property.managerId !== actorId) {
    notifs.push({ userId: ticket.property.managerId, ticketId, type: "TICKET_CREATED", title: "New Request", message: `"${title}" submitted` });
  }
  if (action === "assigned" && extra?.assigneeId && extra.assigneeId !== actorId) {
    notifs.push({ userId: extra.assigneeId, ticketId, type: "TICKET_ASSIGNED", title: "New Assignment", message: `Assigned to: "${title}"` });
  }
  if (action === "status_changed" && ticket.createdById !== actorId) {
    notifs.push({ userId: ticket.createdById, ticketId, type: "STATUS_UPDATE", title: "Request Updated", message: `"${title}" → ${extra?.newStatus?.replace("_", " ")}` });
  }
  if (action === "commented") {
    const users = new Set<string>();
    if (ticket.createdById !== actorId) users.add(ticket.createdById);
    if (ticket.assignedToId && ticket.assignedToId !== actorId) users.add(ticket.assignedToId);
    if (ticket.property.managerId && ticket.property.managerId !== actorId) users.add(ticket.property.managerId);
    users.forEach(uid => notifs.push({ userId: uid, ticketId, type: "COMMENT_ADDED", title: "New Comment", message: `Comment on "${title}"` }));
  }

  if (notifs.length > 0) {
    await prisma.notification.createMany({
      data: notifs.map(n => ({ ...n, link: `/tickets/${ticketId}` })),
    });
  }
}
