import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { RECEIPT_MESSAGES } from "@/lib/receipt-errors";
import { getClientIp } from "@/lib/server/client-ip";
import { getCurrentActor } from "@/lib/server/get-current-actor";
import { checkRateLimit } from "@/lib/server/rate-limit";

const f = createUploadthing();

export const ourFileRouter = {
  receiptImage: f({ image: { maxFileSize: "8MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      const actor = await getCurrentActor();
      if (!actor) throw new UploadThingError("Unauthorized");

      const rateLimit = await checkRateLimit(`upload:${getClientIp(req)}`, { limit: 15, windowSeconds: 600 });
      if (!rateLimit.allowed) {
        throw new UploadThingError(RECEIPT_MESSAGES.uploadRateLimited);
      }

      return { userId: actor.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
