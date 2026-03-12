import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handleApi } from "@/lib/apiHandler";
import { AppError } from "@/lib/errors";
import { uploadAttachment } from "@/services/uploadService";
import type { SessionUser } from "@/services/ticketService";

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const session = await auth();
    if (!session?.user) {
      throw new AppError("UNAUTHORIZED", "Unauthorized", 401);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const ticketId = formData.get("ticketId");

    if (!file || !(file instanceof File)) {
      throw new AppError("BAD_REQUEST", "No file provided", 400);
    }

    if (!ticketId || typeof ticketId !== "string") {
      throw new AppError("BAD_REQUEST", "Ticket ID required", 400);
    }

    const attachment = await uploadAttachment({
      ticketId,
      file,
      actor: session.user as SessionUser,
    });

    return NextResponse.json({ success: true, attachment });
  });
}
