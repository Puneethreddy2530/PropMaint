# Backend Source Code — Qwego / PropMaint

> **Stack:** Next.js 15 Server Actions · NextAuth.js v5 · Prisma ORM · PostgreSQL · Zod · bcryptjs

---

## 1. `prisma/schema.prisma` — Database Schema

```prisma
// PropMaint - Property Maintenance Management System
// Database Schema - PostgreSQL via Prisma ORM

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ── ENUMS ────────────────────────────────────────────────────────────────────

enum UserRole { TENANT   MANAGER   STAFF }

enum TicketStatus {
  OPEN  ASSIGNED  IN_PROGRESS  ON_HOLD  COMPLETED  VERIFIED  CLOSED
}

enum TicketPriority {
  EMERGENCY  // 2-hour SLA
  URGENT     // 24-hour SLA
  ROUTINE    // 72-hour SLA
  SCHEDULED  // No SLA - planned maintenance
}

enum TicketCategory {
  PLUMBING  ELECTRICAL  HVAC  APPLIANCE  STRUCTURAL  PEST_CONTROL  GENERAL  SAFETY
}

enum ActivityAction {
  TICKET_CREATED  STATUS_CHANGED  PRIORITY_CHANGED  ASSIGNED  REASSIGNED
  COMMENT_ADDED   INTERNAL_NOTE_ADDED  PHOTO_UPLOADED  COST_UPDATED  SLA_BREACHED  ESCALATED
}

enum NotificationType {
  TICKET_CREATED  TICKET_ASSIGNED  STATUS_UPDATE  COMMENT_ADDED  SLA_WARNING  ESCALATION
}

// ── USER & AUTH ───────────────────────────────────────────────────────────────

model User {
  id             String    @id @default(cuid())
  email          String    @unique
  name           String
  passwordHash   String
  role           UserRole
  phone          String?
  avatarUrl      String?
  isActive       Boolean   @default(true)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  tenantUnit     Unit?     @relation("TenantUnit", fields: [tenantUnitId], references: [id])
  tenantUnitId   String?
  createdTickets   Ticket[]       @relation("TicketCreator")
  assignedTickets  Ticket[]       @relation("TicketAssignee")
  activities       ActivityLog[]
  comments         Comment[]
  notifications    Notification[]
  managedProperties Property[]    @relation("PropertyManager")
  specialties    TicketCategory[]
  @@index([role])
  @@index([email])
}

// ── PROPERTY HIERARCHY: Property → Building → Unit ───────────────────────────

model Property {
  id        String   @id @default(cuid())
  name      String
  address   String
  city      String
  state     String
  zipCode   String
  imageUrl  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  manager   User?    @relation("PropertyManager", fields: [managerId], references: [id])
  managerId String?
  buildings Building[]
  tickets   Ticket[]
  @@index([managerId])
}

model Building {
  id         String   @id @default(cuid())
  name       String
  floors     Int      @default(1)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  property   Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  propertyId String
  units      Unit[]
  @@index([propertyId])
}

model Unit {
  id         String   @id @default(cuid())
  number     String
  floor      Int      @default(1)
  bedrooms   Int      @default(1)
  bathrooms  Int      @default(1)
  sqft       Int?
  isOccupied Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  building   Building @relation(fields: [buildingId], references: [id], onDelete: Cascade)
  buildingId String
  tenants    User[]   @relation("TenantUnit")
  tickets    Ticket[]
  @@unique([buildingId, number])
  @@index([buildingId])
}

// ── MAINTENANCE TICKETS (core) ────────────────────────────────────────────────

model Ticket {
  id              String         @id @default(cuid())
  title           String
  description     String
  status          TicketStatus   @default(OPEN)
  priority        TicketPriority @default(ROUTINE)
  category        TicketCategory @default(GENERAL)
  permissionToEnter  Boolean     @default(false)
  preferredTimes     String?
  estimatedCost      Float?
  actualCost         Float?
  resolution         String?
  slaDeadline     DateTime?
  slaBroken       Boolean      @default(false)
  acknowledgedAt  DateTime?
  startedAt       DateTime?
  completedAt     DateTime?
  verifiedAt      DateTime?
  closedAt        DateTime?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  property        Property     @relation(fields: [propertyId], references: [id])
  propertyId      String
  unit            Unit         @relation(fields: [unitId], references: [id])
  unitId          String
  createdBy       User         @relation("TicketCreator", fields: [createdById], references: [id])
  createdById     String
  assignedTo      User?        @relation("TicketAssignee", fields: [assignedToId], references: [id])
  assignedToId    String?
  attachments     Attachment[]
  activities      ActivityLog[]
  comments        Comment[]
  notifications   Notification[]
  @@index([status])
  @@index([priority])
  @@index([propertyId])
  @@index([createdById])
  @@index([assignedToId])
  @@index([createdAt])
  @@index([slaDeadline])
}

model Attachment {
  id        String   @id @default(cuid())
  fileName  String
  fileUrl   String
  fileSize  Int
  mimeType  String
  createdAt DateTime @default(now())
  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  ticketId  String
  @@index([ticketId])
}

model ActivityLog {
  id             String         @id @default(cuid())
  action         ActivityAction
  description    String
  previousValue  String?
  newValue       String?
  metadata       Json?
  createdAt      DateTime       @default(now())
  ticket         Ticket         @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  ticketId       String
  performedBy    User           @relation(fields: [performedById], references: [id])
  performedById  String
  @@index([ticketId])
  @@index([createdAt])
}

model Comment {
  id         String   @id @default(cuid())
  content    String
  isInternal Boolean  @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  ticket     Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  ticketId   String
  author     User     @relation(fields: [authorId], references: [id])
  authorId   String
  @@index([ticketId])
  @@index([createdAt])
}

model Notification {
  id        String           @id @default(cuid())
  type      NotificationType
  title     String
  message   String
  read      Boolean          @default(false)
  link      String?
  createdAt DateTime         @default(now())
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  ticket    Ticket?          @relation(fields: [ticketId], references: [id], onDelete: SetNull)
  ticketId  String?
  @@index([userId, read])
  @@index([createdAt])
}
```

---

## 2. `src/lib/auth.ts` — NextAuth Configuration

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.isActive) return null;

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isPasswordValid) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.id = user.id!; token.role = user.role; }
      return token;
    },
    async session({ session, token }) {
      if (token) { session.user.id = token.id; session.user.role = token.role; }
      return session;
    },
    async authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/tickets") ||
        nextUrl.pathname.startsWith("/analytics") ||
        nextUrl.pathname.startsWith("/team") ||
        nextUrl.pathname.startsWith("/profile") ||
        nextUrl.pathname.startsWith("/notifications");
      const isOnLogin = nextUrl.pathname.startsWith("/login");

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false;
      } else if (isOnLogin) {
        if (isLoggedIn) return Response.redirect(new URL("/dashboard", nextUrl));
      }
      return true;
    },
  },
  pages: { signIn: "/login" },
  trustHost: true,
});
```

---

## 3. `src/lib/prisma.ts` — Prisma Client Singleton

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
```

---

## 4. `src/lib/permissions.ts` — RBAC Permission System

```ts
import { UserRole } from "@prisma/client";

export const PERMISSIONS = {
  "ticket:create": [UserRole.TENANT, UserRole.MANAGER],
  "ticket:read:own": [UserRole.TENANT, UserRole.MANAGER, UserRole.STAFF],
  "ticket:read:all": [UserRole.MANAGER],
  "ticket:read:assigned": [UserRole.STAFF],
  "ticket:assign": [UserRole.MANAGER],
  "ticket:update:status": [UserRole.MANAGER, UserRole.STAFF],
  "ticket:update:priority": [UserRole.MANAGER],
  "ticket:update:cost": [UserRole.MANAGER, UserRole.STAFF],
  "ticket:delete": [UserRole.MANAGER],
  "ticket:close": [UserRole.MANAGER],
  "ticket:verify": [UserRole.MANAGER, UserRole.TENANT],
  "comment:create": [UserRole.TENANT, UserRole.MANAGER, UserRole.STAFF],
  "comment:internal": [UserRole.MANAGER, UserRole.STAFF],
  "team:view": [UserRole.MANAGER],
  "team:manage": [UserRole.MANAGER],
  "analytics:view": [UserRole.MANAGER],
  "property:manage": [UserRole.MANAGER],
  "notification:manage": [UserRole.TENANT, UserRole.MANAGER, UserRole.STAFF],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return PERMISSIONS[permission]?.includes(role) ?? false;
}

export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function getRolePermissions(role: UserRole): Permission[] {
  return (Object.entries(PERMISSIONS) as [Permission, UserRole[]][])
    .filter(([, roles]) => roles.includes(role))
    .map(([permission]) => permission);
}

// SLA Config
export const SLA_HOURS: Record<string, number> = {
  EMERGENCY: 2,
  URGENT: 24,
  ROUTINE: 72,
  SCHEDULED: 168,
};

export function calculateSLADeadline(createdAt: Date, priority: string): Date {
  const hours = SLA_HOURS[priority] ?? 72;
  return new Date(createdAt.getTime() + hours * 60 * 60 * 1000);
}

export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  "/dashboard": [UserRole.TENANT, UserRole.MANAGER, UserRole.STAFF],
  "/tickets": [UserRole.TENANT, UserRole.MANAGER, UserRole.STAFF],
  "/tickets/new": [UserRole.TENANT, UserRole.MANAGER],
  "/analytics": [UserRole.MANAGER],
  "/team": [UserRole.MANAGER],
  "/profile": [UserRole.TENANT, UserRole.MANAGER, UserRole.STAFF],
  "/notifications": [UserRole.TENANT, UserRole.MANAGER, UserRole.STAFF],
};
```

---

## 5. `src/lib/ticket-utils.ts` — Ticket Helper Utilities

```ts
import { TicketStatus, TicketPriority, TicketCategory } from "@prisma/client";

export const STATUS_CONFIG: Record<TicketStatus, { label: string; variant: string; icon: string }> = {
  OPEN: { label: "Open", variant: "open", icon: "circle-dot" },
  ASSIGNED: { label: "Assigned", variant: "assigned", icon: "user-check" },
  IN_PROGRESS: { label: "In Progress", variant: "inProgress", icon: "loader" },
  ON_HOLD: { label: "On Hold", variant: "onHold", icon: "pause-circle" },
  COMPLETED: { label: "Completed", variant: "completed", icon: "check-circle" },
  VERIFIED: { label: "Verified", variant: "verified", icon: "shield-check" },
  CLOSED: { label: "Closed", variant: "closed", icon: "archive" },
};

export const PRIORITY_CONFIG: Record<TicketPriority, { label: string; variant: string; icon: string; slaHours: number }> = {
  EMERGENCY: { label: "Emergency", variant: "emergency", icon: "siren", slaHours: 2 },
  URGENT: { label: "Urgent", variant: "urgent", icon: "alert-triangle", slaHours: 24 },
  ROUTINE: { label: "Routine", variant: "routine", icon: "clock", slaHours: 72 },
  SCHEDULED: { label: "Scheduled", variant: "scheduled", icon: "calendar", slaHours: 168 },
};

export const CATEGORY_CONFIG: Record<TicketCategory, { label: string; icon: string; emoji: string }> = {
  PLUMBING: { label: "Plumbing", icon: "droplets", emoji: "🔧" },
  ELECTRICAL: { label: "Electrical", icon: "zap", emoji: "⚡" },
  HVAC: { label: "HVAC", icon: "thermometer", emoji: "❄️" },
  APPLIANCE: { label: "Appliance", icon: "refrigerator", emoji: "🏠" },
  STRUCTURAL: { label: "Structural", icon: "building", emoji: "🏗️" },
  PEST_CONTROL: { label: "Pest Control", icon: "bug", emoji: "🐛" },
  GENERAL: { label: "General", icon: "wrench", emoji: "🔨" },
  SAFETY: { label: "Safety", icon: "shield-alert", emoji: "🚨" },
};

export function getStatusConfig(status: TicketStatus) { return STATUS_CONFIG[status] || STATUS_CONFIG.OPEN; }
export function getPriorityConfig(priority: TicketPriority) { return PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.ROUTINE; }
export function getCategoryConfig(category: TicketCategory) { return CATEGORY_CONFIG[category] || CATEGORY_CONFIG.GENERAL; }
export function formatStatus(status: string): string { return STATUS_CONFIG[status as TicketStatus]?.label || status.replace(/_/g, " "); }

export function getNextStatuses(currentStatus: TicketStatus, role: string): TicketStatus[] {
  const transitions: Record<TicketStatus, Record<string, TicketStatus[]>> = {
    OPEN: { MANAGER: [TicketStatus.ASSIGNED, TicketStatus.CLOSED], STAFF: [], TENANT: [] },
    ASSIGNED: { MANAGER: [TicketStatus.IN_PROGRESS, TicketStatus.OPEN, TicketStatus.CLOSED], STAFF: [TicketStatus.IN_PROGRESS], TENANT: [] },
    IN_PROGRESS: { MANAGER: [TicketStatus.ON_HOLD, TicketStatus.COMPLETED, TicketStatus.CLOSED], STAFF: [TicketStatus.ON_HOLD, TicketStatus.COMPLETED], TENANT: [] },
    ON_HOLD: { MANAGER: [TicketStatus.IN_PROGRESS, TicketStatus.CLOSED], STAFF: [TicketStatus.IN_PROGRESS], TENANT: [] },
    COMPLETED: { MANAGER: [TicketStatus.VERIFIED, TicketStatus.IN_PROGRESS, TicketStatus.CLOSED], STAFF: [], TENANT: [TicketStatus.VERIFIED] },
    VERIFIED: { MANAGER: [TicketStatus.CLOSED], STAFF: [], TENANT: [] },
    CLOSED: { MANAGER: [TicketStatus.OPEN], STAFF: [], TENANT: [] },
  };
  return transitions[currentStatus]?.[role] || [];
}
```

---

## 6. `src/actions/auth.ts` — Authentication Server Actions

```ts
"use server";

import { signIn, signOut } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin": return { error: "Invalid email or password" };
        default: return { error: "Something went wrong. Please try again." };
      }
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function quickLoginAction(role: "tenant" | "manager" | "staff") {
  const emails: Record<string, string> = {
    tenant: "sarah.johnson@demo.com",
    manager: "michael.chen@demo.com",
    staff: "james.rodriguez@demo.com",
  };

  try {
    await signIn("credentials", { email: emails[role], password: "demo123", redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Demo login failed. Please seed the database first." };
    }
    throw error;
  }
}
```

---

## 7. `src/actions/activity.ts` — Audit Log & Notifications

```ts
"use server";

import prisma from "@/lib/prisma";
import { ActivityAction, NotificationType } from "@prisma/client";

interface LogActivityParams {
  ticketId: string;
  performedById: string;
  action: ActivityAction;
  description: string;
  previousValue?: string;
  newValue?: string;
  metadata?: Record<string, unknown>;
}

export async function logActivity(params: LogActivityParams) {
  return prisma.activityLog.create({
    data: {
      ticketId: params.ticketId,
      performedById: params.performedById,
      action: params.action,
      description: params.description,
      previousValue: params.previousValue || null,
      newValue: params.newValue || null,
      metadata: params.metadata || null,
    },
  });
}

interface CreateNotificationParams {
  userId: string; ticketId: string; type: NotificationType;
  title: string; message: string; link?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  return prisma.notification.create({
    data: {
      userId: params.userId, ticketId: params.ticketId, type: params.type,
      title: params.title,  message: params.message,
      link: params.link || `/tickets/${params.ticketId}`,
    },
  });
}

export async function notifyOnTicketAction(
  ticketId: string,
  action: "created" | "assigned" | "status_changed" | "commented",
  actorId: string,
  extra?: { assigneeId?: string; newStatus?: string; ticketTitle?: string }
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { createdBy: true, assignedTo: true, property: { include: { manager: true } } },
  });
  if (!ticket) return;

  const title = extra?.ticketTitle || ticket.title;
  const notifications: CreateNotificationParams[] = [];

  switch (action) {
    case "created":
      if (ticket.property.managerId && ticket.property.managerId !== actorId) {
        notifications.push({
          userId: ticket.property.managerId, ticketId,
          type: NotificationType.TICKET_CREATED,
          title: "New Maintenance Request",
          message: `New request: "${title}" submitted for ${ticket.property.name}`,
        });
      }
      break;

    case "assigned":
      if (extra?.assigneeId && extra.assigneeId !== actorId) {
        notifications.push({
          userId: extra.assigneeId, ticketId,
          type: NotificationType.TICKET_ASSIGNED,
          title: "New Assignment",
          message: `You've been assigned to: "${title}"`,
        });
      }
      break;

    case "status_changed":
      if (ticket.createdById !== actorId) {
        notifications.push({
          userId: ticket.createdById, ticketId,
          type: NotificationType.STATUS_UPDATE,
          title: "Request Updated",
          message: `Your request "${title}" is now ${extra?.newStatus?.replace("_", " ").toLowerCase()}`,
        });
      }
      if (extra?.newStatus === "COMPLETED" && ticket.property.managerId && ticket.property.managerId !== actorId) {
        notifications.push({
          userId: ticket.property.managerId, ticketId,
          type: NotificationType.STATUS_UPDATE,
          title: "Work Completed",
          message: `"${title}" has been marked as completed and needs verification`,
        });
      }
      break;

    case "commented":
      const usersToNotify = new Set<string>();
      if (ticket.createdById !== actorId) usersToNotify.add(ticket.createdById);
      if (ticket.assignedToId && ticket.assignedToId !== actorId) usersToNotify.add(ticket.assignedToId);
      if (ticket.property.managerId && ticket.property.managerId !== actorId) usersToNotify.add(ticket.property.managerId);

      usersToNotify.forEach((userId) => {
        notifications.push({ userId, ticketId, type: NotificationType.COMMENT_ADDED, title: "New Comment", message: `New comment on "${title}"` });
      });
      break;
  }

  if (notifications.length > 0) {
    await prisma.notification.createMany({
      data: notifications.map((n) => ({
        userId: n.userId, ticketId: n.ticketId, type: n.type,
        title: n.title, message: n.message, link: `/tickets/${ticketId}`,
      })),
    });
  }
}
```

---

## 8. `src/actions/tickets.ts` — Ticket Server Actions (All CRUD + Queries)

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission, calculateSLADeadline } from "@/lib/permissions";
import { logActivity, notifyOnTicketAction } from "./activity";
import { TicketStatus, TicketPriority, TicketCategory, ActivityAction } from "@prisma/client";

// ── Validation Schemas ─────────────────────────────────────────────────────

const createTicketSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000),
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

// ── CREATE TICKET ─────────────────────────────────────────────────────────────

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
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const data = parsed.data;
  const now = new Date();
  const slaDeadline = calculateSLADeadline(now, data.priority);

  try {
    const ticket = await prisma.ticket.create({
      data: {
        title: data.title, description: data.description, category: data.category,
        priority: data.priority, propertyId: data.propertyId, unitId: data.unitId,
        createdById: session.user.id, permissionToEnter: data.permissionToEnter,
        preferredTimes: data.preferredTimes, slaDeadline, status: TicketStatus.OPEN,
      },
    });

    await logActivity({
      ticketId: ticket.id, performedById: session.user.id,
      action: ActivityAction.TICKET_CREATED,
      description: `${session.user.name} submitted a new ${data.priority.toLowerCase()} ${data.category.toLowerCase().replace("_", " ")} request`,
      newValue: JSON.stringify({ status: "OPEN", priority: data.priority, category: data.category }),
    });

    await notifyOnTicketAction(ticket.id, "created", session.user.id, { ticketTitle: data.title });

    revalidatePath("/tickets");
    revalidatePath("/dashboard");
    redirect(`/tickets/${ticket.id}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    return { error: "Failed to create ticket. Please try again." };
  }
}

// ── UPDATE TICKET STATUS ──────────────────────────────────────────────────────

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
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { ticketId, status, resolution } = parsed.data;
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return { error: "Ticket not found" };

  const timestamps: Record<string, Date> = {};
  const now = new Date();
  switch (status) {
    case TicketStatus.ASSIGNED: timestamps.acknowledgedAt = now; break;
    case TicketStatus.IN_PROGRESS: timestamps.startedAt = now; break;
    case TicketStatus.COMPLETED: timestamps.completedAt = now; break;
    case TicketStatus.VERIFIED: timestamps.verifiedAt = now; break;
    case TicketStatus.CLOSED: timestamps.closedAt = now; break;
  }

  const slaBroken = ticket.slaDeadline && now > ticket.slaDeadline && !ticket.completedAt;

  try {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status, resolution: resolution || ticket.resolution, slaBroken: slaBroken || ticket.slaBroken, ...timestamps },
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
  } catch { return { error: "Failed to update status" }; }
}

// ── ASSIGN TICKET ─────────────────────────────────────────────────────────────

export async function assignTicket(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };
  if (!hasPermission(session.user.role, "ticket:assign")) {
    return { error: "Only managers can assign tickets" };
  }

  const raw = { ticketId: formData.get("ticketId") as string, staffId: formData.get("staffId") as string };
  const parsed = assignTicketSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

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
        status: ticket.status === TicketStatus.OPEN ? TicketStatus.ASSIGNED : ticket.status,
        acknowledgedAt: ticket.acknowledgedAt || new Date(),
      },
    });

    await logActivity({
      ticketId, performedById: session.user.id,
      action: previousAssignee ? ActivityAction.REASSIGNED : ActivityAction.ASSIGNED,
      description: `${session.user.name} assigned this ticket to ${staff.name}`,
      previousValue: previousAssignee || undefined, newValue: staffId,
      metadata: { assigneeName: staff.name },
    });

    await notifyOnTicketAction(ticketId, "assigned", session.user.id, { assigneeId: staffId });

    revalidatePath(`/tickets/${ticketId}`);
    revalidatePath("/tickets");
    revalidatePath("/dashboard");
    return { success: true };
  } catch { return { error: "Failed to assign ticket" }; }
}

// ── UPDATE PRIORITY ───────────────────────────────────────────────────────────

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

  const slaDeadline = calculateSLADeadline(ticket.createdAt, priority);

  try {
    await prisma.ticket.update({ where: { id: ticketId }, data: { priority, slaDeadline } });
    await logActivity({
      ticketId, performedById: session.user.id, action: ActivityAction.PRIORITY_CHANGED,
      description: `${session.user.name} changed priority from ${ticket.priority} to ${priority}`,
      previousValue: ticket.priority, newValue: priority,
    });
    revalidatePath(`/tickets/${ticketId}`);
    revalidatePath("/tickets");
    return { success: true };
  } catch { return { error: "Failed to update priority" }; }
}

// ── ADD COMMENT ───────────────────────────────────────────────────────────────

export async function addComment(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const raw = {
    ticketId: formData.get("ticketId") as string,
    content: formData.get("content") as string,
    isInternal: formData.get("isInternal") === "true",
  };

  if (raw.isInternal && !hasPermission(session.user.role, "comment:internal")) {
    return { error: "You cannot create internal notes" };
  }

  const parsed = addCommentSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  try {
    await prisma.comment.create({
      data: {
        ticketId: parsed.data.ticketId, authorId: session.user.id,
        content: parsed.data.content, isInternal: parsed.data.isInternal,
      },
    });

    await logActivity({
      ticketId: parsed.data.ticketId, performedById: session.user.id,
      action: parsed.data.isInternal ? ActivityAction.INTERNAL_NOTE_ADDED : ActivityAction.COMMENT_ADDED,
      description: `${session.user.name} added ${parsed.data.isInternal ? "an internal note" : "a comment"}`,
    });

    if (!parsed.data.isInternal) {
      await notifyOnTicketAction(parsed.data.ticketId, "commented", session.user.id);
    }

    revalidatePath(`/tickets/${parsed.data.ticketId}`);
    return { success: true };
  } catch { return { error: "Failed to add comment" }; }
}

// ── NOTIFICATION ACTIONS ──────────────────────────────────────────────────────

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

// ── DATA FETCHING ─────────────────────────────────────────────────────────────

export async function getTicketsForUser() {
  const session = await auth();
  if (!session?.user) return [];
  const { role, id } = session.user;

  switch (role) {
    case "TENANT":
      return prisma.ticket.findMany({
        where: { createdById: id },
        include: { property: true, unit: true, assignedTo: { select: { id: true, name: true, avatarUrl: true } }, _count: { select: { comments: true, attachments: true } } },
        orderBy: { createdAt: "desc" },
      });
    case "MANAGER":
      return prisma.ticket.findMany({
        where: { property: { managerId: id } },
        include: { property: true, unit: true, createdBy: { select: { id: true, name: true, avatarUrl: true } }, assignedTo: { select: { id: true, name: true, avatarUrl: true } }, _count: { select: { comments: true, attachments: true } } },
        orderBy: { createdAt: "desc" },
      });
    case "STAFF":
      return prisma.ticket.findMany({
        where: { assignedToId: id },
        include: { property: true, unit: true, createdBy: { select: { id: true, name: true, avatarUrl: true } }, _count: { select: { comments: true, attachments: true } } },
        orderBy: { createdAt: "desc" },
      });
    default: return [];
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
      activities: { include: { performedBy: { select: { id: true, name: true, role: true, avatarUrl: true } } }, orderBy: { createdAt: "desc" } },
      comments: { include: { author: { select: { id: true, name: true, role: true, avatarUrl: true } } }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!ticket) return null;
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
    case "TENANT": where = { createdById: id }; break;
    case "MANAGER": where = { property: { managerId: id } }; break;
    case "STAFF": where = { assignedToId: id }; break;
  }

  const [total, open, inProgress, completed, urgent, slaBroken] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.count({ where: { ...where, status: { in: [TicketStatus.OPEN, TicketStatus.ASSIGNED] } } }),
    prisma.ticket.count({ where: { ...where, status: TicketStatus.IN_PROGRESS } }),
    prisma.ticket.count({ where: { ...where, status: { in: [TicketStatus.COMPLETED, TicketStatus.VERIFIED, TicketStatus.CLOSED] } } }),
    prisma.ticket.count({ where: { ...where, priority: { in: [TicketPriority.EMERGENCY, TicketPriority.URGENT] }, status: { notIn: [TicketStatus.COMPLETED, TicketStatus.VERIFIED, TicketStatus.CLOSED] } } }),
    prisma.ticket.count({ where: { ...where, slaBroken: true } }),
  ]);

  const recentTickets = await prisma.ticket.findMany({
    where,
    include: { property: true, unit: true, createdBy: { select: { name: true, avatarUrl: true } }, assignedTo: { select: { name: true, avatarUrl: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const unreadNotifications = await prisma.notification.count({ where: { userId: id, read: false } });

  return { total, open, inProgress, completed, urgent, slaBroken, recentTickets, unreadNotifications };
}

export async function getStaffMembers() {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") return [];

  return prisma.user.findMany({
    where: { role: "STAFF", isActive: true },
    select: {
      id: true, name: true, email: true, phone: true, avatarUrl: true, specialties: true,
      _count: { select: { assignedTickets: { where: { status: { notIn: [TicketStatus.COMPLETED, TicketStatus.VERIFIED, TicketStatus.CLOSED] } } } } },
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
      include: { buildings: { include: { units: { orderBy: { number: "asc" } } } } },
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { tenantUnit: { include: { building: { include: { property: { include: { buildings: { include: { units: { orderBy: { number: "asc" } } } } } } } } } } },
  });

  if (user?.tenantUnit?.building?.property) return [user.tenantUnit.building.property];
  return [];
}

export async function getNotifications() {
  const session = await auth();
  if (!session?.user) return [];

  return prisma.notification.findMany({
    where: { userId: session.user.id },
    include: { ticket: { select: { id: true, title: true, status: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
```
