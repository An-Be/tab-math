import { headers } from "next/headers";

/** Vercel sets x-forwarded-for; not present in plain local dev, where
 * "local" is an acceptable stand-in since there's no adversarial traffic. */
export async function getClientIp(): Promise<string> {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return headerStore.get("x-real-ip") ?? "local";
}
