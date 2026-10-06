import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getCurrentActor } from "@/lib/get-current-actor";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";

const f = createUploadthing();

export const ourFileRouter = {
  receiptImage: f({ image: { maxFileSize: "8MB", maxFileCount: 1 } })
    .middleware(async () => {
      const actor = await getCurrentActor();
      if (!actor) throw new UploadThingError("Unauthorized");

      const ip = await getClientIp();
      const rateLimit = await checkRateLimit(`upload:${ip}`, { limit: 15, windowSeconds: 600 });
      if (!rateLimit.allowed) {
        throw new UploadThingError("Too many uploads — try again in a bit.");
      }

      return { userId: actor.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
