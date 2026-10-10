/**
 * navigator.clipboard only exists in a secure context (HTTPS or localhost).
 * Testing from a phone over Wi-Fi at a plain-http LAN address doesn't qualify,
 * so this falls back to execCommand, which has no such restriction.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to the legacy path
    }
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.className = "fixed opacity-0 pointer-events-none";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
