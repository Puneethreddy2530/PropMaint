import prisma from "@/lib/prisma";
import { getStorageProvider } from "@/lib/storage";
import { AppError } from "@/lib/errors";
import type { SessionUser } from "./ticketService";
import { logActivity } from "./activityService";
import { ActivityAction } from "@prisma/client";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const ALLOWED_EXTS = [".jpg", ".jpeg", ".png", ".webp"] as const;

function hasValidImageSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === "image/png") {
    const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    return buffer.subarray(0, 8).equals(pngSig);
  }
  if (mimeType === "image/webp") {
    // WebP signature format is 'RIFF' starting at byte 0, and 'WEBP' starting at byte 8.
    const riff = Buffer.from("RIFF");
    const webp = Buffer.from("WEBP");
    return buffer.subarray(0, 4).equals(riff) && buffer.subarray(8, 12).equals(webp);
  }
  return false;
}

export interface UploadAttachmentInput {
  ticketId: string;
  file: File;
  actor: SessionUser;
}

export interface UploadAttachmentResult {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
}

export async function uploadAttachment(input: UploadAttachmentInput): Promise<UploadAttachmentResult> {
  const { ticketId, file, actor } = input;

  if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
    throw new AppError("BAD_REQUEST", "Invalid file type. Allowed: JPEG, PNG, WebP", 400);
  }

  const lowerName = file.name.toLowerCase();
  if (!ALLOWED_EXTS.some((ext) => lowerName.endsWith(ext))) {
    throw new AppError("BAD_REQUEST", "Invalid file extension. Allowed: .jpg, .jpeg, .png, .webp", 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new AppError("BAD_REQUEST", "File too large. Maximum size is 5MB", 400);
  }

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, deletedAt: null },
  });
  if (!ticket) {
    throw new AppError("NOT_FOUND", "Ticket not found", 404);
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  if (!hasValidImageSignature(buffer, file.type)) {
    throw new AppError("BAD_REQUEST", "Invalid image content. Only JPEG/PNG/WebP are allowed", 400);
  }

  const storage = getStorageProvider();
  const stored = await storage.saveFile({
    buffer,
    contentType: file.type,
    originalName: file.name,
  });

  const attachment = await prisma.attachment.create({
    data: {
      ticketId,
      fileName: stored.fileName,
      fileUrl: stored.url,
      fileSize: stored.size,
      mimeType: stored.contentType,
    },
  });

  await logActivity({
    ticketId,
    performedById: actor.id,
    action: ActivityAction.PHOTO_UPLOADED,
    description: `${actor.name} uploaded ${file.name}`,
  });

  return {
    id: attachment.id,
    fileName: attachment.fileName,
    fileUrl: attachment.fileUrl,
    fileSize: attachment.fileSize,
  };
}
