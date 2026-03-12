export interface SaveFileInput {
  buffer: Buffer;
  contentType: string;
  originalName: string;
}

export interface StoredFile {
  fileName: string;
  storedFileName: string;
  url: string;
  size: number;
  contentType: string;
}

export interface StorageProvider {
  saveFile(input: SaveFileInput): Promise<StoredFile>;
}
