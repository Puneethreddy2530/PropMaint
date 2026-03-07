"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission, calculateSLADeadline } from "@/lib/permissions";
import { logActivity, notifyOnTicketAction } from "./activity";
import {
  TicketStatus,
  TicketPriority,
  TicketCategory,
  ActivityAction,
} from "@prisma/client";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  OPEN: ["ASSIGNED", "CLOSED"],
  ASSIGNED: ["IN_PROGRESS", "OPEN"],
  IN_PROGRESS: ["COMPLETED", "ON_HOLD", "ASSIGNED"],
  ON_HOLD: ["IN_PROGRESS", "CLOSED"],
  COMPLETED: ["VERIFIED", "IN_PROGRESS"],
  VERIFIED: ["CLOSED"],
  CLOSED: ["OPEN"]
};

// ============================================================================
// Validation schemas
// ============================================================================

const createTicketSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(2000),
  category: z.nativeEnum(TicketCategory),
  priority: z.nativeEnum(TicketPriority),
  propertyId: z.string().min(1, "Property is required"),
  unitId: z.string().min(1, "Unit is required"),
  permissionToEnter: z.boolean().default(false),
  preferredTimes: z.string().optional(),
});

const updateStatusSchema = z.object({
  ticketId: z.string(),
  status: z.nativeEnum(TicketStatus),
  resolution: z.string().optional(),
});

const assignTicketSchema = z.object({
  ticketId: z.string(),
  staffId: z.string(),
});

const addCommentSchema = z.object({
  ticketId: z.string(),
  content: z.string().min(1, "Comment cannot be empty").max(2000),
  isInternal: z.boolean().default(false),
});

// ============================================================================
// CREATE TICKET
// ============================================================================

export async function createTicket(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };
  if (!hasPermission(session.user.role, "ticket:create")) {
    return { error: "You don't have permission to create tickets" };
  }

  const raw = {
    title: formData.get("title") as string,
    description: formData.get("description") as string,
    category: formData.get("category") as string,
    priority: formData.get("priority") as string,
    propertyId: formData.get("propertyId") as string,
    unitId: formData.get("unitId") as string,
    permissionToEnter: formData.get("permissionToEnter") === "true",
    preferredTimes: (formData.get("preferredTimes") as string) || undefined,
  };

  const parsed = createTicketSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const data = parsed.data;

  // Calculate SLA deadline
  const now = new Date();
  const slaDeadline = calculateSLADeadline(now, data.priority);

  try {
    const ticket = await prisma.ticket.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority,
        propertyId: data.propertyId,
        unitId: data.unitId,
        createdById: session.user.id,
        permissionToEnter: data.permissionToEnter,
        preferredTimes: data.preferredTimes,
        slaDeadline,
        status: TicketStatus.OPEN,
      },
    });

    // Log activity
    await logActivity({
      ticketId: ticket.id,
      performedById: session.user.id,
      action: ActivityAction.TICKET_CREATED,
      description: `${session.user.name} submitted a new ${data.priority.toLowerCase()} ${data.category.toLowerCase().replace("_", " ")} request`,
      newValue: JSON.stringify({
        status: "OPEN",
        priority: data.priority,
        category: data.category,
      }),
    });

    // Send notifications
    await notifyOnTicketAction(ticket.id, "created", session.user.id, {
      ticketTitle: data.title,
    });

    revalidatePath("/tickets");
    revalidatePath("/dashboard");
    redirect(`/tickets/${ticket.id}`);
  } catch (error) {
    // redirect() throws a special error, rethrow it
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    console.error("Failed to create ticket:", error);
    return { error: "Failed to create ticket. Please try again." };
  }
}

// ============================================================================
// UPDATE TICKET STATUS
// ============================================================================

export async function updateTicketStatus(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };
  if (!hasPermission(session.user.role, "ticket:update:status")) {
    return { error: "You don't have permission to update ticket status" };
  }

  const raw = {
    ticketId: formData.get("ticketId") as string,
    status: formData.get("status") as string,
    resolution: (formData.get("resolution") as string) || undefined,
  };

  const parsed = updateStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { ticketId, status, resolution } = parsed.data;

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) return { error: "Ticket not found" };

  // Strict state machine validation
  const currentStatus = ticket.status as string;
  const allowedNextStatuses = ALLOWED_TRANSITIONS[currentStatus] || [];

  if (currentStatus !== status && !allowedNextStatuses.includes(status)) {
    return {
      error: `Invalid status transition from ${currentStatus.replace("_", " ")} to ${status.replace("_", " ")}`
    };
  }

  // Build timestamp updates based on status transition
  const timestamps: Record<string, Date> = {};
  const now = new Date();

  switch (status) {
    case TicketStatus.ASSIGNED:
      timestamps.acknowledgedAt = now;
      break;
    case TicketStatus.IN_PROGRESS:
      timestamps.startedAt = now;
      break;
    case TicketStatus.COMPLETED:
      timestamps.completedAt = now;
      break;
    case TicketStatus.VERIFIED:
      timestamps.verifiedAt = now;
      break;
    case TicketStatus.CLOSED:
      timestamps.closedAt = now;
      break;
  }

  // Check SLA breach
  const slaBroken =
    ticket.slaDeadline && now > ticket.slaDeadline && !ticket.completedAt;

  try {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status,
        resolution: resolution || ticket.resolution,
        slaBroken: slaBroken || ticket.slaBroken,
        ...timestamps,
      },
    });

    // Log activity
    await logActivity({
      ticketId,
      performedById: session.user.id,
      action: ActivityAction.STATUS_CHANGED,
      description: `${session.user.name} changed status from ${ticket.status.replace("_", " ")} to ${status.replace("_", " ")}`,
      previousValue: ticket.status,
      newValue: status,
    });

    // Notify
    await notifyOnTicketAction(ticketId, "status_changed", session.user.id, {
      newStatus: status,
    });

    revalidatePath(`/tickets/${ticketId}`);
    revalidatePath("/tickets");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Failed to update ticket status:", error);
    return { error: "Failed to update status" };
  }
}

// ============================================================================
// ASSIGN TICKET TO STAFF
// ============================================================================

export async function assignTicket(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };
  if (!hasPermission(session.user.role, "ticket:assign")) {
    return { error: "Only managers can assign tickets" };
  }

  const raw = {
    ticketId: formData.get("ticketId") as string,
    staffId: formData.get("staffId") as string,
  };

  const parsed = assignTicketSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { ticketId, staffId } = parsed.data;

  const [ticket, staff] = await Promise.all([
    prisma.ticket.findUnique({ where: { id: ticketId } }),
    prisma.user.findUnique({ where: { id: staffId } }),
  ]);

  if (!ticket) return { error: "Ticket not found" };
  if (!staff) return { error: "Staff member not found" };

  const previousAssignee = ticket.assignedToId;

  try {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        assignedToId: staffId,
        status:
          ticket.status === TicketStatus.OPEN
            ? TicketStatus.ASSIGNED
            : ticket.status,
        acknowledgedAt: ticket.acknowledgedAt || new Date(),
      },
    });

    // Log activity
    await logActivity({
      ticketId,
      performedById: session.user.id,
      action: previousAssignee
        ? ActivityAction.REASSIGNED
        : ActivityAction.ASSIGNED,
      description: `${session.user.name} assigned this ticket to ${staff.name}`,
      previousValue: previousAssignee || undefined,
      newValue: staffId,
      metadata: { assigneeName: staff.name },
    });

    // Notify
    await notifyOnTicketAction(ticketId, "assigned", session.user.id, {
      assigneeId: staffId,
    });

    revalidatePath(`/tickets/${ticketId}`);
    revalidatePath("/tickets");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Failed to assign ticket:", error);
    return { error: "Failed to assign ticket" };
  }
}

// ============================================================================
// UPDATE TICKET PRIORITY
// ============================================================================

export async function updateTicketPriority(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };
  if (!hasPermission(session.user.role, "ticket:update:priority")) {
    return { error: "Only managers can change priority" };
  }

  const ticketId = formData.get("ticketId") as string;
  const priority = formData.get("priority") as TicketPriority;

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return { error: "Ticket not found" };

  // Recalculate SLA with new priority
  const slaDeadline = calculateSLADeadline(ticket.createdAt, priority);

  try {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { priority, slaDeadline },
    });

    await logActivity({
      ticketId,
      performedById: session.user.id,
      action: ActivityAction.PRIORITY_CHANGED,
      description: `${session.user.name} changed priority from ${ticket.priority} to ${priority}`,
      previousValue: ticket.priority,
      newValue: priority,
    });

    revalidatePath(`/tickets/${ticketId}`);
    revalidatePath("/tickets");

    return { success: true };
  } catch (error) {
    console.error("Failed to update priority:", error);
    return { error: "Failed to update priority" };
  }
}

// ============================================================================
// ADD COMMENT
// ============================================================================

export async function addComment(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const raw = {
    ticketId: formData.get("ticketId") as string,
    content: formData.get("content") as string,
    isInternal: formData.get("isInternal") === "true",
  };

  // Check internal note permission
  if (raw.isInternal && !hasPermission(session.user.role, "comment:internal")) {
    return { error: "You can't create internal notes" };
  }

  const parsed = addCommentSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    await prisma.comment.create({
      data: {
        ticketId: parsed.data.ticketId,
        authorId: session.user.id,
        content: parsed.data.content,
        isInternal: parsed.data.isInternal,
      },
    });

    // Log activity
    await logActivity({
      ticketId: parsed.data.ticketId,
      performedById: session.user.id,
      action: parsed.data.isInternal
        ? ActivityAction.INTERNAL_NOTE_ADDED
        : ActivityAction.COMMENT_ADDED,
      description: `${session.user.name} added ${parsed.data.isInternal ? "an internal note" : "a comment"}`,
    });

    // Notify (only for external comments)
    if (!parsed.data.isInternal) {
      await notifyOnTicketAction(
        parsed.data.ticketId,
        "commented",
        session.user.id
      );
    }

    revalidatePath(`/tickets/${parsed.data.ticketId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to add comment:", error);
    return { error: "Failed to add comment" };
  }
}

// ============================================================================
// NOTIFICATION ACTIONS
// ============================================================================

export async function markNotificationRead(notificationId: string) {
  const session = await auth();
  if (!session?.user) return;

  await prisma.notification.update({
    where: { id: notificationId, userId: session.user.id },
    data: { read: true },
  });

  revalidatePath("/notifications");
}

export async function markAllNotificationsRead() {
  const session = await auth();
  if (!session?.user) return;

  await prisma.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  });

  revalidatePath("/notifications");
}

// ============================================================================
// DATA FETCHING HELPERS (Server-side)
// ============================================================================

export async function getTicketsForUser() {
  const session = await auth();
  if (!session?.user) return [];

  const { role, id } = session.user;

  switch (role) {
    case "TENANT":
      return prisma.ticket.findMany({
        where: { createdById: id },
        include: {
          property: true,
          unit: true,
          assignedTo: { select: { id: true, name: true, avatarUrl: true } },
          _count: { select: { comments: true, attachments: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    case "MANAGER":
      return prisma.ticket.findMany({
        where: { property: { managerId: id } },
        include: {
          property: true,
          unit: true,
          createdBy: { select: { id: true, name: true, avatarUrl: true } },
          assignedTo: { select: { id: true, name: true, avatarUrl: true } },
          _count: { select: { comments: true, attachments: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    case "STAFF":
      return prisma.ticket.findMany({
        where: { assignedToId: id },
        include: {
          property: true,
          unit: true,
          createdBy: { select: { id: true, name: true, avatarUrl: true } },
          _count: { select: { comments: true, attachments: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    default:
      return [];
  }
}

export async function getTicketById(ticketId: string) {
  const session = await auth();
  if (!session?.user) return null;

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      property: true,
      unit: { include: { building: true } },
      createdBy: { select: { id: true, name: true, email: true, role: true, avatarUrl: true, phone: true } },
      assignedTo: { select: { id: true, name: true, email: true, role: true, avatarUrl: true, phone: true } },
      attachments: { orderBy: { createdAt: "desc" } },
      activities: {
        include: {
          performedBy: { select: { id: true, name: true, role: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      comments: {
        include: {
          author: { select: { id: true, name: true, role: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket) return null;

  // Filter internal comments for tenants
  if (session.user.role === "TENANT") {
    ticket.comments = ticket.comments.filter((c) => !c.isInternal);
  }

  return ticket;
}

export async function getDashboardStats() {
  const session = await auth();
  if (!session?.user) return null;

  const { role, id } = session.user;

  let where = {};
  switch (role) {
    case "TENANT":
      where = { createdById: id };
      break;
    case "MANAGER":
      where = { property: { managerId: id } };
      break;
    case "STAFF":
      where = { assignedToId: id };
      break;
  }

  const [total, open, inProgress, completed, urgent, slaBroken] =
    await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.count({
        where: { ...where, status: { in: [TicketStatus.OPEN, TicketStatus.ASSIGNED] } },
      }),
      prisma.ticket.count({
        where: { ...where, status: TicketStatus.IN_PROGRESS },
      }),
      prisma.ticket.count({
        where: {
          ...where,
          status: { in: [TicketStatus.COMPLETED, TicketStatus.VERIFIED, TicketStatus.CLOSED] },
        },
      }),
      prisma.ticket.count({
        where: {
          ...where,
          priority: { in: [TicketPriority.EMERGENCY, TicketPriority.URGENT] },
          status: { notIn: [TicketStatus.COMPLETED, TicketStatus.VERIFIED, TicketStatus.CLOSED] },
        },
      }),
      prisma.ticket.count({
        where: { ...where, slaBroken: true },
      }),
    ]);

  // Recent tickets
  const recentTickets = await prisma.ticket.findMany({
    where,
    include: {
      property: true,
      unit: true,
      createdBy: { select: { name: true, avatarUrl: true } },
      assignedTo: { select: { name: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // Unread notifications count
  const unreadNotifications = await prisma.notification.count({
    where: { userId: id, read: false },
  });

  return {
    total,
    open,
    inProgress,
    completed,
    urgent,
    slaBroken,
    recentTickets,
    unreadNotifications,
  };
}

export async function getStaffMembers() {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") return [];

  return prisma.user.findMany({
    where: { role: "STAFF", isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      specialties: true,
      _count: {
        select: {
          assignedTickets: {
            where: {
              status: { notIn: [TicketStatus.COMPLETED, TicketStatus.VERIFIED, TicketStatus.CLOSED] },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function getPropertiesForUser() {
  const session = await auth();
  if (!session?.user) return [];

  if (session.user.role === "MANAGER") {
    return prisma.property.findMany({
      where: { managerId: session.user.id },
      include: {
        buildings: {
          include: {
            units: { orderBy: { number: "asc" } },
          },
        },
      },
    });
  }

  // Tenants see only their property
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      tenantUnit: {
        include: {
          building: {
            include: {
              property: {
                include: {
                  buildings: {
                    include: {
                      units: { orderBy: { number: "asc" } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (user?.tenantUnit?.building?.property) {
    return [user.tenantUnit.building.property];
  }

  return [];
}

export async function getNotifications() {
  const session = await auth();
  if (!session?.user) return [];

  return prisma.notification.findMany({
    where: { userId: session.user.id },
    include: {
      ticket: { select: { id: true, title: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
