"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission, calculateSLADeadline } from "@/lib/permissions";
import { logActivity, notifyOnTicketAction } from "./activity";
import { TicketStatus, TicketPriority, TicketCategory, ActivityAction } from "@prisma/client";

const createTicketSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(2000),
  category: z.nativeEnum(TicketCategory),
  priority: z.nativeEnum(TicketPriority),
  propertyId: z.string().min(1),
  unitId: z.string().min(1),
  permissionToEnter: z.boolean().default(false),
  preferredTimes: z.string().optional(),
});

export async function createTicket(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };
  if (!hasPermission(session.user.role, "ticket:create")) return { error: "No permission" };

  const parsed = createTicketSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    priority: formData.get("priority"),
    propertyId: formData.get("propertyId"),
    unitId: formData.get("unitId"),
    permissionToEnter: formData.get("permissionToEnter") === "true",
    preferredTimes: formData.get("preferredTimes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const data = parsed.data;
  const now = new Date();

  try {
    const ticket = await prisma.ticket.create({
      data: {
        ...data, createdById: session.user.id,
        slaDeadline: calculateSLADeadline(now, data.priority),
        status: TicketStatus.OPEN,
      },
    });
    await logActivity({
      ticketId: ticket.id, performedById: session.user.id,
      action: ActivityAction.TICKET_CREATED,
      description: `${session.user.name} submitted a new ${data.priority.toLowerCase()} ${data.category.toLowerCase().replace("_", " ")} request`,
    });
    await notifyOnTicketAction(ticket.id, "created", session.user.id, { ticketTitle: data.title });
    revalidatePath("/tickets");
    revalidatePath("/dashboard");
    redirect(`/tickets/${ticket.id}`);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    return { error: "Failed to create ticket" };
  }
}

export async function updateTicketStatus(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const ticketId = formData.get("ticketId") as string;
  const status = formData.get("status") as TicketStatus;
  const resolution = formData.get("resolution") as string | null;

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return { error: "Not found" };

  const timestamps: Record<string, Date> = {};
  const now = new Date();
  if (status === "ASSIGNED") timestamps.acknowledgedAt = now;
  if (status === "IN_PROGRESS") timestamps.startedAt = now;
  if (status === "COMPLETED") timestamps.completedAt = now;
  if (status === "VERIFIED") timestamps.verifiedAt = now;
  if (status === "CLOSED") timestamps.closedAt = now;

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { status, resolution: resolution || ticket.resolution, ...timestamps,
      slaBroken: (ticket.slaDeadline && now > ticket.slaDeadline && !ticket.completedAt) || ticket.slaBroken },
  });

  await logActivity({
    ticketId, performedById: session.user.id, action: ActivityAction.STATUS_CHANGED,
    description: `${session.user.name} changed status from ${ticket.status.replace("_", " ")} to ${status.replace("_", " ")}`,
    previousValue: ticket.status, newValue: status,
  });
  await notifyOnTicketAction(ticketId, "status_changed", session.user.id, { newStatus: status });
  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/tickets");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function assignTicket(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };
  if (!hasPermission(session.user.role, "ticket:assign")) return { error: "No permission" };

  const ticketId = formData.get("ticketId") as string;
  const staffId = formData.get("staffId") as string;
  const [ticket, staff] = await Promise.all([
    prisma.ticket.findUnique({ where: { id: ticketId } }),
    prisma.user.findUnique({ where: { id: staffId } }),
  ]);
  if (!ticket || !staff) return { error: "Not found" };

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { assignedToId: staffId,
      status: ticket.status === "OPEN" ? "ASSIGNED" : ticket.status,
      acknowledgedAt: ticket.acknowledgedAt || new Date() },
  });
  await logActivity({
    ticketId, performedById: session.user.id,
    action: ticket.assignedToId ? ActivityAction.REASSIGNED : ActivityAction.ASSIGNED,
    description: `${session.user.name} assigned to ${staff.name}`,
    metadata: { assigneeName: staff.name },
  });
  await notifyOnTicketAction(ticketId, "assigned", session.user.id, { assigneeId: staffId });
  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/tickets");
  return { success: true };
}

export async function addComment(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };
  const ticketId = formData.get("ticketId") as string;
  const content = formData.get("content") as string;
  const isInternal = formData.get("isInternal") === "true";

  if (!content?.trim()) return { error: "Comment cannot be empty" };

  await prisma.comment.create({ data: { ticketId, authorId: session.user.id, content, isInternal } });
  await logActivity({
    ticketId, performedById: session.user.id,
    action: isInternal ? ActivityAction.INTERNAL_NOTE_ADDED : ActivityAction.COMMENT_ADDED,
    description: `${session.user.name} added ${isInternal ? "an internal note" : "a comment"}`,
  });
  if (!isInternal) await notifyOnTicketAction(ticketId, "commented", session.user.id);
  revalidatePath(`/tickets/${ticketId}`);
  return { success: true };
}

export async function markNotificationRead(id: string) {
  const session = await auth();
  if (!session?.user) return;
  await prisma.notification.update({ where: { id, userId: session.user.id }, data: { read: true } });
  revalidatePath("/notifications");
}

export async function markAllNotificationsRead() {
  const session = await auth();
  if (!session?.user) return;
  await prisma.notification.updateMany({ where: { userId: session.user.id, read: false }, data: { read: true } });
  revalidatePath("/notifications");
}

// Data fetching
export async function getTicketsForUser() {
  const session = await auth();
  if (!session?.user) return [];
  const { role, id } = session.user;
  const where = role === "TENANT" ? { createdById: id }
    : role === "MANAGER" ? { property: { managerId: id } }
    : { assignedToId: id };
  return prisma.ticket.findMany({
    where, include: {
      property: true, unit: true,
      createdBy: { select: { id: true, name: true, avatarUrl: true } },
      assignedTo: { select: { id: true, name: true, avatarUrl: true } },
      _count: { select: { comments: true, attachments: true } },
    }, orderBy: { createdAt: "desc" },
  });
}

export async function getTicketById(ticketId: string) {
  const session = await auth();
  if (!session?.user) return null;
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      property: true, unit: { include: { building: true } },
      createdBy: { select: { id: true, name: true, email: true, role: true, avatarUrl: true, phone: true } },
      assignedTo: { select: { id: true, name: true, email: true, role: true, avatarUrl: true, phone: true } },
      attachments: { orderBy: { createdAt: "desc" } },
      activities: { include: { performedBy: { select: { id: true, name: true, role: true, avatarUrl: true } } }, orderBy: { createdAt: "desc" } },
      comments: { include: { author: { select: { id: true, name: true, role: true, avatarUrl: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!ticket) return null;
  if (session.user.role === "TENANT") ticket.comments = ticket.comments.filter(c => !c.isInternal);
  return ticket;
}

export async function getDashboardStats() {
  const session = await auth();
  if (!session?.user) return null;
  const { role, id } = session.user;
  const where = role === "TENANT" ? { createdById: id } : role === "MANAGER" ? { property: { managerId: id } } : { assignedToId: id };

  const [total, open, inProgress, completed, urgent, slaBroken] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.count({ where: { ...where, status: { in: ["OPEN", "ASSIGNED"] } } }),
    prisma.ticket.count({ where: { ...where, status: "IN_PROGRESS" } }),
    prisma.ticket.count({ where: { ...where, status: { in: ["COMPLETED", "VERIFIED", "CLOSED"] } } }),
    prisma.ticket.count({ where: { ...where, priority: { in: ["EMERGENCY", "URGENT"] }, status: { notIn: ["COMPLETED", "VERIFIED", "CLOSED"] } } }),
    prisma.ticket.count({ where: { ...where, slaBroken: true } }),
  ]);

  const recentTickets = await prisma.ticket.findMany({
    where, include: {
      property: true, unit: true,
      createdBy: { select: { name: true, avatarUrl: true } },
      assignedTo: { select: { name: true, avatarUrl: true } },
    }, orderBy: { createdAt: "desc" }, take: 5,
  });

  const unreadNotifications = await prisma.notification.count({ where: { userId: id, read: false } });
  return { total, open, inProgress, completed, urgent, slaBroken, recentTickets, unreadNotifications };
}

export async function getStaffMembers() {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") return [];
  return prisma.user.findMany({
    where: { role: "STAFF", isActive: true },
    select: { id: true, name: true, email: true, phone: true, specialties: true,
      _count: { select: { assignedTickets: { where: { status: { notIn: ["COMPLETED", "VERIFIED", "CLOSED"] } } } } } },
    orderBy: { name: "asc" },
  });
}

export async function getPropertiesForUser() {
  const session = await auth();
  if (!session?.user) return [];
  if (session.user.role === "MANAGER") {
    return prisma.property.findMany({
      where: { managerId: session.user.id },
      include: { buildings: { include: { units: { orderBy: { number: "asc" } } } } },
    });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { tenantUnit: { include: { building: { include: { property: { include: { buildings: { include: { units: { orderBy: { number: "asc" } } } } } } } } } } },
  });
  return user?.tenantUnit?.building?.property ? [user.tenantUnit.building.property] : [];
}

export async function getNotifications() {
  const session = await auth();
  if (!session?.user) return [];
  return prisma.notification.findMany({
    where: { userId: session.user.id },
    include: { ticket: { select: { id: true, title: true, status: true } } },
    orderBy: { createdAt: "desc" }, take: 50,
  });
}
