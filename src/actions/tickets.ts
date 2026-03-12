"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { toErrorResponse, AppError } from "@/lib/errors";
import type { ActionResult } from "@/types/action";
import * as TicketService from "@/services/ticketService";
import {
  TicketStatus,
  TicketPriority,
  TicketCategory,
} from "@prisma/client";

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

function requireUser(session: Awaited<ReturnType<typeof auth>>) {
  if (!session?.user) {
    throw new AppError("UNAUTHORIZED", "Unauthorized", 401);
  }
  return session.user as TicketService.SessionUser;
}

// ============================================================================
// CREATE TICKET
// ============================================================================

export async function createTicket(formData: FormData): Promise<ActionResult> {
  const session = await auth();

  try {
    const user = requireUser(session);
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

    const parsed = createTicketSchema.parse(raw);

    const ticket = await TicketService.createTicket(parsed, user);

    revalidatePath("/tickets");
    revalidatePath("/dashboard");
    redirect(`/tickets/${ticket.id}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    return toErrorResponse(error);
  }
}

// ============================================================================
// UPDATE TICKET STATUS
// ============================================================================

export async function updateTicketStatus(formData: FormData): Promise<ActionResult> {
  const session = await auth();

  try {
    const user = requireUser(session);
    const raw = {
      ticketId: formData.get("ticketId") as string,
      status: formData.get("status") as string,
      resolution: (formData.get("resolution") as string) || undefined,
    };

    const parsed = updateStatusSchema.parse(raw);
    await TicketService.updateStatus(parsed, user);

    revalidatePath(`/tickets/${parsed.ticketId}`);
    revalidatePath("/tickets");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    return toErrorResponse(error);
  }
}

// ============================================================================
// ASSIGN TICKET TO STAFF
// ============================================================================

export async function assignTicket(formData: FormData): Promise<ActionResult> {
  const session = await auth();

  try {
    const user = requireUser(session);
    const raw = {
      ticketId: formData.get("ticketId") as string,
      staffId: formData.get("staffId") as string,
    };

    const parsed = assignTicketSchema.parse(raw);
    await TicketService.assignTechnician(parsed, user);

    revalidatePath(`/tickets/${parsed.ticketId}`);
    revalidatePath("/tickets");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    return toErrorResponse(error);
  }
}

// ============================================================================
// UPDATE TICKET PRIORITY
// ============================================================================

export async function updateTicketPriority(formData: FormData): Promise<ActionResult> {
  const session = await auth();

  try {
    const user = requireUser(session);
    const ticketId = formData.get("ticketId") as string;
    const priority = formData.get("priority") as TicketPriority;

    const parsed = z
      .object({ ticketId: z.string(), priority: z.nativeEnum(TicketPriority) })
      .parse({ ticketId, priority });

    await TicketService.updatePriority(parsed, user);

    revalidatePath(`/tickets/${parsed.ticketId}`);
    revalidatePath("/tickets");

    return { success: true };
  } catch (error) {
    return toErrorResponse(error);
  }
}

// ============================================================================
// ADD COMMENT
// ============================================================================

export async function addComment(formData: FormData): Promise<ActionResult> {
  const session = await auth();

  try {
    const user = requireUser(session);
    const raw = {
      ticketId: formData.get("ticketId") as string,
      content: formData.get("content") as string,
      isInternal: formData.get("isInternal") === "true",
    };

    const parsed = addCommentSchema.parse(raw);
    await TicketService.addComment(parsed, user);

    revalidatePath(`/tickets/${parsed.ticketId}`);
    return { success: true };
  } catch (error) {
    return toErrorResponse(error);
  }
}

// ============================================================================
// NOTIFICATION ACTIONS
// ============================================================================

export async function markNotificationRead(notificationId: string) {
  const session = await auth();
  if (!session?.user) return;

  await TicketService.markNotificationRead(notificationId, session.user.id);
  revalidatePath("/notifications");
}

export async function markAllNotificationsRead() {
  const session = await auth();
  if (!session?.user) return;

  await TicketService.markAllNotificationsRead(session.user.id);
  revalidatePath("/notifications");
}

// ============================================================================
// DATA FETCHING HELPERS (Server-side)
// ============================================================================

export async function getTicketsForUser() {
  const session = await auth();
  if (!session?.user) return [];

  return TicketService.getTicketsForUser(session.user as TicketService.SessionUser);
}

export async function getTicketById(ticketId: string) {
  const session = await auth();
  if (!session?.user) return null;

  return TicketService.getTicketById(ticketId, session.user.role);
}

export async function getDashboardStats() {
  const session = await auth();
  if (!session?.user) return null;

  return TicketService.getDashboardStats(session.user as TicketService.SessionUser);
}

export async function getStaffMembers() {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") return [];

  return TicketService.getStaffMembers(session.user as TicketService.SessionUser);
}

export async function getPropertiesForUser() {
  const session = await auth();
  if (!session?.user) return [];

  return TicketService.getPropertiesForUser(session.user as TicketService.SessionUser);
}

export async function getNotifications() {
  const session = await auth();
  if (!session?.user) return [];

  return TicketService.getNotifications(session.user as TicketService.SessionUser);
}
