"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, RotateCcw } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { RECEIPT_MESSAGES, extractErrorMessage } from "@/lib/receipt-errors";
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

      // api() never throws and tolerates a non-JSON body (a platform timeout
      // answers with an HTML page), so errors are picked by status below.
      const res = await api<{
        ok?: boolean;
        items?: LineItem[];
        taxCents?: number;
        tipCents?: number;
        rawText?: string;
      } | null>(`/api/splits/${splitId}/extract`, { method: "POST", body: { imageUrl } });
      if (!res.ok) {
        toast.error(extractErrorMessage(res.status, res.body));
        onExtractFailed("");
        return;
      }

      const result = res.data;
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
          className="max-h-64 border border-ink object-contain"
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
        variant={preview ? "outline" : "primary"}
        size={preview ? "md" : "lg"}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Reading receipt…
          </>
        ) : preview ? (
          <>
            <RotateCcw className="size-4" aria-hidden="true" />
            Retake photo
          </>
        ) : (
          <>
            <Camera className="size-4" aria-hidden="true" />
            Snap the receipt
          </>
        )}
      </Button>
    </div>
  );
}
