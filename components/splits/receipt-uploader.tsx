"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useUploadThing } from "@/lib/uploadthing";
import type { LineItem } from "@/lib/generated/prisma/client";

type Props = {
  splitId: string;
  receiptImageUrl: string | null;
  onExtracted: (items: LineItem[], taxCents: number, tipCents: number) => void;
  onExtractFailed: (rawText: string) => void;
};

export function ReceiptUploader({
  splitId,
  receiptImageUrl,
  onExtracted,
  onExtractFailed,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [extracting, setExtracting] = useState(false);
  const [preview, setPreview] = useState<string | null>(receiptImageUrl);

  const { startUpload, isUploading } = useUploadThing("receiptImage", {
    onUploadError: (error) => {
      toast.error(error.message || "Upload failed. Try again.");
      setExtracting(false);
    },
  });

  async function handleFileSelected(file: File) {
    setPreview(URL.createObjectURL(file));
    setExtracting(true);
    try {
      const uploaded = await startUpload([file]);
      const imageUrl = uploaded?.[0]?.serverData?.url;
      if (!imageUrl) throw new Error("No upload URL returned");

      const res = await fetch(`/api/splits/${splitId}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Extraction failed");

      if (data.ok) {
        onExtracted(data.items, data.taxCents, data.tipCents);
      } else {
        onExtractFailed(data.rawText ?? "");
      }
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Couldn't read the receipt. Add items manually below.";
      toast.error(message);
      onExtractFailed("");
    } finally {
      setExtracting(false);
    }
  }

  const busy = isUploading || extracting;

  return (
    <div className="flex flex-col items-center gap-3">
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Receipt"
          className="max-h-64 rounded-none border border-foreground/15 object-contain"
        />
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelected(file);
          e.target.value = "";
        }}
      />

      <Button
        type="button"
        variant={preview ? "outline" : "default"}
        size={preview ? "default" : "lg"}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="font-mono text-xs tracking-wide uppercase"
      >
        {busy ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Reading receipt…
          </>
        ) : preview ? (
          <>
            <RotateCcw className="size-4" />
            Retake photo
          </>
        ) : (
          <>
            <Camera className="size-4" />
            Snap the receipt
          </>
        )}
      </Button>
    </div>
  );
}
