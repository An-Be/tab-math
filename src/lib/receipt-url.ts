// The extract route fetches the receipt photo server-side, so the URL it's
// given must point at our own upload storage. Anything else would let a caller
// make the server fetch arbitrary URLs (SSRF), including internal addresses.

const ALLOWED_HOST_SUFFIXES = [".ufs.sh"] as const;
const ALLOWED_HOSTS = ["utfs.io"] as const;

/** True only for https URLs on Uploadthing's file hosts. */
export function isUploadthingFileUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
  const host = url.hostname.toLowerCase();
  return (
    (ALLOWED_HOSTS as readonly string[]).includes(host) ||
    ALLOWED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix) && host.length > suffix.length)
  );
}
