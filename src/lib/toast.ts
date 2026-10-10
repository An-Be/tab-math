// Tiny global toast store. Call toast() from any client code (event handlers,
// async callbacks); <Toaster /> in the root layout renders the queue.

export type ToastTone = "info" | "error";
export type ToastItem = { id: number; message: string; tone: ToastTone };

type Listener = (toasts: ToastItem[]) => void;

const TOAST_MS = 3500;
const MAX_VISIBLE = 3;

let items: ToastItem[] = [];
let nextId = 0;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l(items);
}

function push(message: string, tone: ToastTone) {
  const id = nextId++;
  items = [...items.slice(-(MAX_VISIBLE - 1)), { id, message, tone }];
  emit();
  setTimeout(() => dismiss(id), TOAST_MS);
}

export function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getToasts(): ToastItem[] {
  return items;
}

/** toast("Saved"), toast.success("Copied"), toast.error("Couldn't save") */
export const toast = Object.assign((message: string) => push(message, "info"), {
  success: (message: string) => push(message, "info"),
  error: (message: string) => push(message, "error"),
});
