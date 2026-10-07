"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useUploadThing } from "@/lib/uploadthing";
import { RECEIPT_MESSAGES, extractErrorMessage, readJsonSafely } from "@/lib/receipt-errors";
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
    // Uploadthing's own messages can be technical; only our rate-limit
    // message is written for people, so anything else gets the plain one.
    onUploadError: (error) => {
      toast.error(
        error.message === RECEIPT_MESSAGES.uploadRateLimited
          ? RECEIPT_MESSAGES.uploadRateLimited
          : RECEIPT_MESSAGES.uploadFailed
      );
    },
  });

  async function handleFileSelected(file: File) {
    setPreview(URL.createObjectURL(file));
    setExtracting(true);
    try {
      const uploaded = await startUpload([file]);
      // undefined: onUploadError above already told them what happened.
      if (!uploaded) {
        onExtractFailed("");
        return;
      }
      const imageUrl = uploaded[0]?.serverData?.url;
      if (!imageUrl) {
        toast.error(RECEIPT_MESSAGES.uploadFailed);
        onExtractFailed("");
        return;
      }

      const res = await fetch(`/api/splits/${splitId}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });
      // A platform timeout answers with an HTML error page, not JSON, so the
      // body is parsed defensively rather than with a bare res.json().
      const data = await readJsonSafely(res);
      if (!res.ok) {
        toast.error(extractErrorMessage(res.status, data));
        onExtractFailed("");
        return;
      }

      const result = data as {
        ok?: boolean;
        items?: LineItem[];
        taxCents?: number;
        tipCents?: number;
        rawText?: string;
      } | null;
      if (result?.ok && result.items) {
        onExtracted(result.items, result.taxCents ?? 0, result.tipCents ?? 0);
      } else {
        onExtractFailed(result?.rawText ?? "");
      }
    } catch {
      // Network drop or anything unexpected: never show the raw error.
      toast.error(RECEIPT_MESSAGES.generic);
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
