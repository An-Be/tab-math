import "server-only";
import { randomBytes } from "node:crypto";

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const TOKEN_LENGTH = 22;

/**
 * A secret-link credential: 128 bits from the OS CSPRNG, base62-encoded
 * (22 chars). Use this for anything where holding the URL grants access.
 * Never use cuid()/uuid() for that; they are identifiers, not secrets.
 */
export function newToken(): string {
  let n = BigInt("0x" + randomBytes(16).toString("hex"));
  let out = "";
  while (n > 0n) {
    out = ALPHABET[Number(n % 62n)] + out;
    n /= 62n;
  }
  return out.padStart(TOKEN_LENGTH, "0");
}

/** Cheap format check before any database lookup. */
export function isWellFormedToken(t: unknown): t is string {
  return typeof t === "string" && /^[0-9A-Za-z]{16,32}$/.test(t);
}
