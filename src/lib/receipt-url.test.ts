import { describe, expect, it } from "vitest";
import { isUploadthingFileUrl } from "./receipt-url";

describe("isUploadthingFileUrl", () => {
  it("accepts Uploadthing file hosts over https", () => {
    expect(isUploadthingFileUrl("https://abc123.ufs.sh/f/key")).toBe(true);
    expect(isUploadthingFileUrl("https://utfs.io/f/key")).toBe(true);
  });

  it("rejects everything else", () => {
    for (const bad of [
      "http://abc123.ufs.sh/f/key",
      "https://ufs.sh/f/key",
      "https://evil.com/ufs.sh",
      "https://abc.ufs.sh.evil.com/f",
      "https://user:pass@abc.ufs.sh/f",
      "https://abc.ufs.sh:8443/f",
      "https://169.254.169.254/latest/meta-data",
      "http://localhost:3200/api/splits",
      "file:///etc/passwd",
      "not a url",
    ]) {
      expect(isUploadthingFileUrl(bad), bad).toBe(false);
    }
  });
});
