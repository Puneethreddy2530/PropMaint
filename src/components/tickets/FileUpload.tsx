"use client";

import { useState, useCallback } from "react";
import { UploadCloud, X } from "lucide-react";

export function FileUpload({ onUpload }: { onUpload: (url: string) => void }) {
    const [preview, setPreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFile = useCallback((file: File) => {
        // For a real production app, this is where you'd call a Server Action to upload to AWS S3 / Cloudinary.
        // For this zero-cost demo, we create a local object URL to display instantly.
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);
        onUpload(objectUrl);
    }, [onUpload]);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    }, [handleFile]);

    return (
        <div className="w-full">
            {!preview ? (
                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={onDrop}
                    className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center transition-colors cursor-pointer ${isDragging ? "border-primary bg-primary/10" : "border-muted-foreground/25 hover:bg-muted/50"
                        }`}
                >
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="file-upload"
                        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    />
                    <label htmlFor="file-upload" className="flex flex-col items-center cursor-pointer w-full h-full">
                        <UploadCloud className="h-10 w-10 text-muted-foreground mb-4" />
                        <p className="text-sm font-medium">Drag & drop an image, or click to browse</p>
                        <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WebP up to 5MB</p>
                    </label>
                </div>
            ) : (
                <div className="relative rounded-lg overflow-hidden border">
                    <img src={preview} alt="Preview" className="w-full h-48 object-cover" />
                    <button
                        onClick={() => { setPreview(null); onUpload(""); }}
                        className="absolute top-2 right-2 bg-black/50 p-1.5 rounded-full text-white hover:bg-black/70 transition"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
