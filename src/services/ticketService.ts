import prisma from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { hasPermission, calculateSLADeadline } from "@/lib/permissions";
import { buildStatusTimestamps, isTransitionAllowed } from "@/lib/ticketWorkflow";
import { logActivity, notifyOnTicketAction } from "./activityService";
import {
  ActivityAction,
  Prisma,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  UserRole,
} from "@prisma/client";

export interface SessionUser {
  id: string;
  name: string;
  role: UserRole;
}

export interface CreateTicketInput {
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  propertyId: string;
  unitId: string;
  permissionToEnter: boolean;
  preferredTimes?: string;
}

export interface UpdateStatusInput {
  ticketId: string;
  status: TicketStatus;
  resolution?: string;
}

export interface AssignTechnicianInput {
  ticketId: string;
  staffId: string;
}

export interface UpdatePriorityInput {
  ticketId: string;
  priority: TicketPriority;
}

export interface AddCommentInput {
  ticketId: string;
  content: string;
  isInternal: boolean;
}

const ticketListInclude = {
  property: true,
  unit: true,
  createdBy: { select: { id: true, name: true, avatarUrl: true } },
  assignedTo: { select: { id: true, name: true, avatarUrl: true } },
  _count: { select: { comments: true, attachments: true } },
} satisfies Prisma.TicketInclude;

export type TicketListItem = Prisma.TicketGetPayload<{
  include: typeof ticketListInclude;
}>;

export type TicketDetail = Prisma.TicketGetPayload<{
  include: {
    property: true;
    unit: { include: { building: true } };
    createdBy: { select: { id: true; name: true; email: true; role: true; avatarUrl: true; phone: true } };
    assignedTo: { select: { id: true; name: true; email: true; role: true; avatarUrl: true; phone: true } };
    attachments: { orderBy: { createdAt: "desc" } };
    activities: {
      include: { performedBy: { select: { id: true; name: true; role: true; avatarUrl: true } } };
      orderBy: { createdAt: "desc" };
    };
    comments: {
      include: { author: { select: { id: true; name: true; role: true; avatarUrl: true } } };
      orderBy: { createdAt: "asc" };
    };
  };
}>;

export interface DashboardStats {
  total: number;
  open: number;
  inProgress: number;
  completed: number;
  urgent: number;
  slaBroken: number;
  recentTickets: Prisma.TicketGetPayload<{
    include: {
      property: true;
      unit: true;
      createdBy: { select: { name: true; avatarUrl: true } };
      assignedTo: { select: { name: true; avatarUrl: true } };
    };
  }>[];
  unreadNotifications: number;
}

export type StaffMember = Prisma.UserGetPayload<{
  select: {
    id: true;
    name: true;
    email: true;
    phone: true;
    avatarUrl: true;
    specialties: true;
    _count: { select: { assignedTickets: { where: { status: { notIn: TicketStatus[] } } } } };
  };
}>;

export type NotificationItem = Prisma.NotificationGetPayload<{
  include: { ticket: { select: { id: true; title: true; status: true } } };
}>;

export async function createTicket(input: CreateTicketInput, actor: SessionUser) {
  if (!hasPermission(actor.role, "ticket:create")) {
    throw new AppError("FORBIDDEN", "You don't have permission to create tickets", 403);
  }

  const now = new Date();
  const slaDeadline = calculateSLADeadline(now, input.priority);

  const ticket = await prisma.ticket.create({
    data: {
      title: input.title,
      description: input.description,
      category: input.category,
      priority: input.priority,
      propertyId: input.propertyId,
      unitId: input.unitId,
      createdById: actor.id,
      permissionToEnter: input.permissionToEnter,
      preferredTimes: input.preferredTimes,
      slaDeadline,
      status: TicketStatus.OPEN,
    },
  });

  await logActivity({
    ticketId: ticket.id,
    performedById: actor.id,
    action: ActivityAction.TICKET_CREATED,
    description: `${actor.name} submitted a new ${input.priority.toLowerCase()} ${input.category.toLowerCase().replace("_", " ")} request`,
    newValue: JSON.stringify({
      status: "OPEN",
      priority: input.priority,
      category: input.category,
    }),
  });

  await notifyOnTicketAction(ticket.id, "created", actor.id, {
    ticketTitle: input.title,
  });

  return ticket;
}

export async function updateStatus(input: UpdateStatusInput, actor: SessionUser) {
  if (!hasPermission(actor.role, "ticket:update:status")) {
    throw new AppError("FORBIDDEN", "You don't have permission to update ticket status", 403);
  }

  await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({ where: { id: input.ticketId } });
    if (!ticket || ticket.deletedAt) {
      throw new AppError("NOT_FOUND", "Ticket not found", 404);
    }

    if (!isTransitionAllowed(ticket.status, input.status)) {
      throw new AppError(
        "BAD_REQUEST",
        `Invalid status transition from ${ticket.status.replace("_", " ")} to ${input.status.replace("_", " ")}`,
        400
      );
    }

    const now = new Date();
    const timestamps = buildStatusTimestamps(input.status, now);
    const slaBroken =
      ticket.slaDeadline && now > ticket.slaDeadline && !ticket.completedAt;

    const updated = await tx.ticket.updateMany({
      where: { id: input.ticketId, version: ticket.version, deletedAt: null },
      data: {
        status: input.status,
        resolution: input.resolution || ticket.resolution,
        slaBroken: slaBroken || ticket.slaBroken,
        version: { increment: 1 },
        ...timestamps,
      },
    });

    if (updated.count === 0) {
      throw new AppError(
        "CONFLICT",
        "Ticket was updated by another user. Please refresh and try again.",
        409
      );
    }

    await logActivity(
      {
        ticketId: input.ticketId,
        performedById: actor.id,
        action: ActivityAction.STATUS_CHANGED,
        description: `${actor.name} changed status from ${ticket.status.replace("_", " ")} to ${input.status.replace("_", " ")}`,
        previousValue: ticket.status,
        newValue: input.status,
      },
      tx
    );

    await notifyOnTicketAction(
      input.ticketId,
      "status_changed",
      actor.id,
      { newStatus: input.status },
      tx
    );
  });

  return;
}

export async function assignTechnician(input: AssignTechnicianInput, actor: SessionUser) {
  if (!hasPermission(actor.role, "ticket:assign")) {
    throw new AppError("FORBIDDEN", "Only managers can assign tickets", 403);
  }

  await prisma.$transaction(async (tx) => {
    const [ticket, staff] = await Promise.all([
      tx.ticket.findFirst({ where: { id: input.ticketId, deletedAt: null } }),
      tx.user.findFirst({
        where: { id: input.staffId, role: "STAFF", isActive: true, deletedAt: null },
      }),
    ]);

    if (!ticket) throw new AppError("NOT_FOUND", "Ticket not found", 404);
    if (!staff) throw new AppError("NOT_FOUND", "Staff member not found", 404);

    const previousAssignee = ticket.assignedToId;

    const updated = await tx.ticket.updateMany({
      where: { id: input.ticketId, version: ticket.version, deletedAt: null },
      data: {
        assignedToId: input.staffId,
        status:
          ticket.status === TicketStatus.OPEN
            ? TicketStatus.ASSIGNED
            : ticket.status,
        acknowledgedAt: ticket.acknowledgedAt || new Date(),
        version: { increment: 1 },
      },
    });

    if (updated.count === 0) {
      throw new AppError(
        "CONFLICT",
        "Ticket was updated by another user. Please refresh and try again.",
        409
      );
    }

    await logActivity(
      {
        ticketId: input.ticketId,
        performedById: actor.id,
        action: previousAssignee ? ActivityAction.REASSIGNED : ActivityAction.ASSIGNED,
        description: `${actor.name} assigned this ticket to ${staff.name}`,
        previousValue: previousAssignee || undefined,
        newValue: input.staffId,
        metadata: { assigneeName: staff.name },
      },
      tx
    );

    await notifyOnTicketAction(
      input.ticketId,
      "assigned",
      actor.id,
      { assigneeId: input.staffId },
      tx
    );
  });

  return;
}

export async function updatePriority(input: UpdatePriorityInput, actor: SessionUser) {
  if (!hasPermission(actor.role, "ticket:update:priority")) {
    throw new AppError("FORBIDDEN", "Only managers can change priority", 403);
  }

  await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findFirst({
      where: { id: input.ticketId, deletedAt: null },
    });

    if (!ticket) throw new AppError("NOT_FOUND", "Ticket not found", 404);

    const slaDeadline = calculateSLADeadline(ticket.createdAt, input.priority);

    const updated = await tx.ticket.updateMany({
      where: { id: input.ticketId, version: ticket.version, deletedAt: null },
      data: { priority: input.priority, slaDeadline, version: { increment: 1 } },
    });

    if (updated.count === 0) {
      throw new AppError(
        "CONFLICT",
        "Ticket was updated by another user. Please refresh and try again.",
        409
      );
    }

    await logActivity(
      {
        ticketId: input.ticketId,
        performedById: actor.id,
        action: ActivityAction.PRIORITY_CHANGED,
        description: `${actor.name} changed priority from ${ticket.priority} to ${input.priority}`,
        previousValue: ticket.priority,
        newValue: input.priority,
      },
      tx
    );
  });

  return;
}

export async function addComment(input: AddCommentInput, actor: SessionUser) {
  if (input.isInternal && !hasPermission(actor.role, "comment:internal")) {
    throw new AppError("FORBIDDEN", "You can't create internal notes", 403);
  }

  const ticket = await prisma.ticket.findFirst({
    where: { id: input.ticketId, deletedAt: null },
  });
  if (!ticket) throw new AppError("NOT_FOUND", "Ticket not found", 404);

  await prisma.comment.create({
    data: {
      ticketId: input.ticketId,
      authorId: actor.id,
      content: input.content,
      isInternal: input.isInternal,
    },
  });

  await logActivity({
    ticketId: input.ticketId,
    performedById: actor.id,
    action: input.isInternal ? ActivityAction.INTERNAL_NOTE_ADDED : ActivityAction.COMMENT_ADDED,
    description: `${actor.name} added ${input.isInternal ? "an internal note" : "a comment"}`,
  });

  if (!input.isInternal) {
    await notifyOnTicketAction(input.ticketId, "commented", actor.id);
  }
}

export async function getTicketsForUser(user: SessionUser): Promise<TicketListItem[]> {
  switch (user.role) {
    case "TENANT":
      return prisma.ticket.findMany({
        where: { createdById: user.id, deletedAt: null },
        include: ticketListInclude,
        orderBy: { createdAt: "desc" },
      });
    case "MANAGER":
      return prisma.ticket.findMany({
        where: { property: { managerId: user.id }, deletedAt: null },
        include: ticketListInclude,
        orderBy: { createdAt: "desc" },
      });
    case "STAFF":
      return prisma.ticket.findMany({
        where: { assignedToId: user.id, deletedAt: null },
        include: ticketListInclude,
        orderBy: { createdAt: "desc" },
      });
    default:
      return [];
  }
}

export async function getTicketById(ticketId: string, viewerRole: UserRole): Promise<TicketDetail | null> {
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, deletedAt: null },
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

  if (viewerRole === "TENANT") {
    ticket.comments = ticket.comments.filter((c) => !c.isInternal);
  }

  return ticket;
}

export async function getDashboardStats(user: SessionUser): Promise<DashboardStats | null> {
  let where: Prisma.TicketWhereInput = {};
  switch (user.role) {
    case "TENANT":
      where = { createdById: user.id, deletedAt: null };
      break;
    case "MANAGER":
      where = { property: { managerId: user.id }, deletedAt: null };
      break;
    case "STAFF":
      where = { assignedToId: user.id, deletedAt: null };
      break;
    default:
      return null;
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

  const unreadNotifications = await prisma.notification.count({
    where: { userId: user.id, read: false },
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

export async function getStaffMembers(user: SessionUser): Promise<StaffMember[]> {
  if (user.role !== "MANAGER") return [];

  return prisma.user.findMany({
    where: { role: "STAFF", isActive: true, deletedAt: null },
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

export async function getPropertiesForUser(user: SessionUser) {
  if (user.role === "MANAGER") {
    return prisma.property.findMany({
      where: { managerId: user.id },
      include: {
        buildings: {
          include: {
            units: { orderBy: { number: "asc" } },
          },
        },
      },
    });
  }

  const dbUser = await prisma.user.findFirst({
    where: { id: user.id, deletedAt: null },
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

  if (dbUser?.tenantUnit?.building?.property) {
    return [dbUser.tenantUnit.building.property];
  }

  return [];
}

export async function getNotifications(user: SessionUser): Promise<NotificationItem[]> {
  return prisma.notification.findMany({
    where: { userId: user.id },
    include: {
      ticket: { select: { id: true, title: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function markNotificationRead(notificationId: string, userId: string) {
  await prisma.notification.update({
    where: { id: notificationId, userId },
    data: { read: true },
  });
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}
