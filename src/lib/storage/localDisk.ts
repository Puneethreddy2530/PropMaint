import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import type { StorageProvider } from "./types";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
};

export const localDiskStorage: StorageProvider = {
  async saveFile({ buffer, contentType, originalName }) {
    const ext = EXT_BY_MIME[contentType] ?? "bin";
    const storedFileName = `${uuidv4()}.${ext}`;

    await mkdir(UPLOAD_DIR, { recursive: true });
    const filePath = join(UPLOAD_DIR, storedFileName);
    await writeFile(filePath, buffer);

    return {
      fileName: originalName,
      storedFileName,
      url: `/uploads/${storedFileName}`,
      size: buffer.length,
      contentType,
    };
  },
};
