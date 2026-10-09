export type PaymentHandles = {
  venmo?: string;
  cashapp?: string;
  zelle?: string;
  stripeLink?: string;
};

export type PaymentOption =
  | { type: "venmo" | "cashapp" | "stripeLink"; label: string; href: string }
  | { type: "zelle"; label: string; value: string };

/** Turns the stored handles (which may be a raw username/handle or a full link)
 * into either a clickable pay link, or — for Zelle, which has no public deep
 * link — plain instructions for the payer to copy. */
export function buildPaymentOptions(handles: PaymentHandles | null | undefined): PaymentOption[] {
  if (!handles) return [];
  const options: PaymentOption[] = [];

  if (handles.venmo) {
    const value = handles.venmo.trim();
    const href = value.startsWith("http") ? value : `https://venmo.com/u/${value.replace(/^@/, "")}`;
    options.push({ type: "venmo", label: "Venmo", href });
  }
  if (handles.cashapp) {
    const value = handles.cashapp.trim();
    const href = value.startsWith("http") ? value : `https://cash.app/$${value.replace(/^\$/, "")}`;
    options.push({ type: "cashapp", label: "Cash App", href });
  }
  if (handles.stripeLink) {
    options.push({ type: "stripeLink", label: "card", href: handles.stripeLink.trim() });
  }
  if (handles.zelle) {
    options.push({ type: "zelle", label: "Zelle", value: handles.zelle.trim() });
  }

  return options;
}
