import { z } from "zod";

// Request schemas for the splits API. Pure, so forms can share the limits.
// parseJsonBody reports the first failing field's message, so each field
// carries a sentence a person can read.

const NAME_ERROR = "Names can be up to 100 characters.";
const LABEL_ERROR = "Item names can be up to 200 characters.";
const MONEY_ERROR = "Amounts must be whole cents, zero or more.";

const cents = z.number({ error: MONEY_ERROR }).int(MONEY_ERROR).min(0, MONEY_ERROR).max(100_000_000, MONEY_ERROR);
const quantity = z.number({ error: "Quantity must be 1 to 999." }).int().min(1).max(999, "Quantity must be 1 to 999.");

export const createSplitSchema = z.object({
  title: z.string({ error: "Give the split a name" }).trim().min(1, "Give the split a name").max(200, "Keep the name under 200 characters."),
  restaurantName: z.string().trim().max(200).optional(),
  peopleNames: z
    .array(z.string({ error: NAME_ERROR }).trim().min(1, NAME_ERROR).max(100, NAME_ERROR), { error: NAME_ERROR })
    .max(50, "Up to 50 people per split.")
    .default([]),
});

export const patchSplitSchema = z.object({
  title: z.string({ error: "Give the split a name" }).trim().min(1, "Give the split a name").max(200).optional(),
  restaurantName: z.string().trim().max(200).nullable().optional(),
  taxCents: cents.optional(),
  tipCents: cents.optional(),
  mode: z.enum(["ITEMIZED", "EVEN"], { error: "Invalid split mode." }).optional(),
  paymentHandles: z
    .object(
      {
        venmo: z.string().trim().max(200).optional(),
        cashapp: z.string().trim().max(200).optional(),
        zelle: z.string().trim().max(200).optional(),
        stripeLink: z.string().trim().max(500).optional(),
      },
      { error: "Invalid payment methods." },
    )
    .optional(),
});

export const setAssignmentsSchema = z.object({
  lineItemId: z.string({ error: "Item not found" }).min(1, "Item not found").max(64),
  personIds: z.array(z.string().min(1).max(64), { error: "Invalid person id" }).max(50, "Invalid person id"),
});

export const extractSchema = z.object({
  // Message is shown to the organizer (see src/lib/receipt-errors.ts).
  imageUrl: z.string({ error: "Couldn't load that photo. Try uploading it again." }).max(2048),
});

export const addItemSchema = z.object({
  label: z.string({ error: LABEL_ERROR }).trim().min(1, "Give the item a name.").max(200, LABEL_ERROR),
  priceCents: cents,
  quantity: quantity.default(1),
});

export const editItemSchema = z.object({
  label: z.string({ error: LABEL_ERROR }).trim().min(1, "Give the item a name.").max(200, LABEL_ERROR).optional(),
  priceCents: cents.optional(),
  quantity: quantity.optional(),
});

export const addPersonSchema = z.object({
  name: z.string({ error: NAME_ERROR }).trim().min(1, "Add a name.").max(100, NAME_ERROR),
});

export const markPaidSchema = z.object({
  paid: z.boolean({ error: "Invalid payment status." }).default(true),
});
