import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSplitOwner } from "@/lib/require-split-owner";

const editItemSchema = z.object({
  label: z.string().trim().min(1).max(200).optional(),
  priceCents: z.number().int().min(0).optional(),
  quantity: z.number().int().min(1).max(999).optional(),
});

async function requireItem(splitId: string, itemId: string) {
  const item = await prisma.lineItem.findUnique({ where: { id: itemId } });
  if (!item || item.splitId !== splitId) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) } as const;
  }
  return { item } as const;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  const ownerResult = await requireSplitOwner(id);
  if ("error" in ownerResult) return ownerResult.error;

  const itemResult = await requireItem(id, itemId);
  if ("error" in itemResult) return itemResult.error;

  const body = await request.json().catch(() => null);
  const parsed = editItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const item = await prisma.lineItem.update({ where: { id: itemId }, data: parsed.data });
  return NextResponse.json({ item });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  const ownerResult = await requireSplitOwner(id);
  if ("error" in ownerResult) return ownerResult.error;

  const itemResult = await requireItem(id, itemId);
  if ("error" in itemResult) return itemResult.error;

  await prisma.lineItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
}
