"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

interface FileUploadProps {
  ticketId: string;
  existingAttachments?: { id: string; fileName: string; fileUrl: string; fileSize: number }[];
  onUploadComplete?: () => void;
}

export function FileUpload({ ticketId, existingAttachments = [], onUploadComplete }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const valid = fileArray.filter(f => {
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(f.type)) {
        toast.error(`${f.name}: Only JPEG, PNG, WebP, GIF allowed`);
        return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name}: File too large (max 5MB)`);
        return false;
      }
      return true;
    });

    if (valid.length === 0) return;

    // Show previews
    const newPreviews = valid.map(file => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setPreviews(prev => [...prev, ...newPreviews]);

    // Upload each file
    setUploading(true);
    let successCount = 0;
    for (const file of valid) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("ticketId", ticketId);

      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (data.success) {
          successCount++;
        } else {
          toast.error(`${file.name}: ${data.error}`);
        }
      } catch {
        toast.error(`${file.name}: Upload failed`);
      }
    }

    setUploading(false);
    if (successCount > 0) {
      toast.success(`${successCount} file${successCount > 1 ? "s" : ""} uploaded`);
      onUploadComplete?.();
    }
  }, [ticketId, onUploadComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  return (
    <div className="space-y-3">
      {/* Existing attachments */}
      {existingAttachments.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {existingAttachments.map(att => (
            <a key={att.id} href={att.fileUrl} target="_blank" rel="noopener noreferrer"
              className="group relative aspect-square rounded-lg overflow-hidden border bg-muted hover:ring-2 hover:ring-primary transition-all">
              <Image src={att.fileUrl} alt={att.fileName} fill className="object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
                <p className="text-[10px] text-white p-1.5 opacity-0 group-hover:opacity-100 truncate w-full">
                  {att.fileName}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Upload previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((p, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
              <Image src={p.url} alt={p.file.name} fill className="object-cover" />
              {uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              )}
              <button onClick={() => setPreviews(prev => prev.filter((_, j) => j !== i))}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/50"
        }`}
      >
        <input ref={inputRef} type="file" accept="image/*" multiple hidden
          onChange={e => e.target.files && handleFiles(e.target.files)} />
        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          ) : (
            <Upload className="w-8 h-8 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-medium">{uploading ? "Uploading..." : "Drop images here or click to browse"}</p>
            <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WebP, GIF up to 5MB</p>
          </div>
        </div>
      </div>
    </div>
  );
}
