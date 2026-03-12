import { localDiskStorage } from "./localDisk";
import type { StorageProvider } from "./types";

export type { SaveFileInput, StoredFile, StorageProvider } from "./types";

export function getStorageProvider(): StorageProvider {
  const driver = process.env.STORAGE_DRIVER ?? "local";

  switch (driver) {
    case "local":
    default:
      return localDiskStorage;
  }
}
