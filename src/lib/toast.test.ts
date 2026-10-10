import { afterEach, describe, expect, it, vi } from "vitest";
import { dismiss, getToasts, subscribe, toast } from "./toast";

afterEach(() => {
  for (const t of getToasts()) dismiss(t.id);
  vi.useRealTimers();
});

describe("toast", () => {
  it("queues messages with a tone and notifies subscribers", () => {
    const seen: number[] = [];
    const unsubscribe = subscribe((t) => seen.push(t.length));
    toast("Saved");
    toast.error("Couldn't save");
    unsubscribe();
    expect(getToasts().map((t) => [t.message, t.tone])).toEqual([
      ["Saved", "info"],
      ["Couldn't save", "error"],
    ]);
    expect(seen).toEqual([1, 2]);
  });

  it("keeps at most three and auto-dismisses", () => {
    vi.useFakeTimers();
    for (const m of ["a", "b", "c", "d"]) toast.success(m);
    expect(getToasts().map((t) => t.message)).toEqual(["b", "c", "d"]);
    vi.advanceTimersByTime(4000);
    expect(getToasts()).toEqual([]);
  });
});
