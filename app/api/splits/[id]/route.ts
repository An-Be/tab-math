import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSplitOwner } from "@/lib/require-split-owner";

const patchSplitSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  restaurantName: z.string().trim().max(200).nullable().optional(),
  taxCents: z.number().int().min(0).optional(),
  tipCents: z.number().int().min(0).optional(),
  mode: z.enum(["ITEMIZED", "EVEN"]).optional(),
  paymentHandles: z
    .object({
      venmo: z.string().trim().max(200).optional(),
      cashapp: z.string().trim().max(200).optional(),
      zelle: z.string().trim().max(200).optional(),
      stripeLink: z.string().trim().max(500).optional(),
    })
    .optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireSplitOwner(id);
  if ("error" in result) return result.error;

  const split = await prisma.split.findUnique({
    where: { id },
    include: {
      people: { orderBy: { createdAt: "asc" } },
      items: { orderBy: { sortOrder: "asc" } },
    },
  });

  return NextResponse.json({ split });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireSplitOwner(id);
  if ("error" in result) return result.error;

  const body = await request.json().catch(() => null);
  const parsed = patchSplitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { paymentHandles, ...splitFields } = parsed.data;

  if (paymentHandles) {
    const user = await prisma.user.findUnique({ where: { id: result.userId } });
    const existing =
      user?.paymentHandles && typeof user.paymentHandles === "object"
        ? (user.paymentHandles as Record<string, string>)
        : {};
    await prisma.user.update({
      where: { id: result.userId },
      data: { paymentHandles: { ...existing, ...paymentHandles } },
    });
  }

  const split = await prisma.split.update({ where: { id }, data: splitFields });

  return NextResponse.json({ split });
}
