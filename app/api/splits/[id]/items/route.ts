import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSplitOwner } from "@/lib/require-split-owner";

const addItemSchema = z.object({
  label: z.string().trim().min(1).max(200),
  priceCents: z.number().int().min(0),
  quantity: z.number().int().min(1).max(999).default(1),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireSplitOwner(id);
  if ("error" in result) return result.error;

  const body = await request.json().catch(() => null);
  const parsed = addItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const maxSortOrder = await prisma.lineItem.aggregate({
    where: { splitId: id },
    _max: { sortOrder: true },
  });

  const item = await prisma.lineItem.create({
    data: {
      splitId: id,
      ...parsed.data,
      sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}
