import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { handleApi } from "@/lib/apiHandler";
import { AppError } from "@/lib/errors";
import { processOfflineMutations } from "@/services/offlineSyncService";
import { TicketStatus } from "@prisma/client";
import type { SessionUser } from "@/services/ticketService";

const mutationSchema = z.object({
  id: z.string(),
  type: z.literal("ticket_status_update"),
  payload: z.object({
    ticketId: z.string(),
    status: z.nativeEnum(TicketStatus),
    resolution: z.string().optional(),
    expectedVersion: z.number().int().positive().optional(),
  }),
  queuedAt: z.string(),
});

const requestSchema = z.object({
  mutations: z.array(mutationSchema).min(1),
});

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const session = await auth();
    if (!session?.user) {
      throw new AppError("UNAUTHORIZED", "Unauthorized", 401);
    }

    const raw = await request.json().catch(() => {
      throw new AppError("BAD_REQUEST", "Invalid JSON payload", 400);
    });

    const parsed = requestSchema.parse(raw);
    const results = await processOfflineMutations(
      parsed.mutations,
      session.user as SessionUser
    );

    return NextResponse.json({ success: true, results });
  });
}
