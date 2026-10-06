import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSplitOwner } from "@/lib/require-split-owner";

const setAssignmentsSchema = z.object({
  lineItemId: z.string().min(1),
  personIds: z.array(z.string().min(1)).max(50),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireSplitOwner(id);
  if ("error" in result) return result.error;

  const body = await request.json().catch(() => null);
  const parsed = setAssignmentsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { lineItemId, personIds } = parsed.data;

  const item = await prisma.lineItem.findUnique({ where: { id: lineItemId } });
  if (!item || item.splitId !== id) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const validPeople = await prisma.person.count({
    where: { id: { in: personIds }, splitId: id },
  });
  if (validPeople !== personIds.length) {
    return NextResponse.json({ error: "Invalid person id" }, { status: 400 });
  }

  const assignments = await prisma.$transaction(async (tx) => {
    await tx.assignment.deleteMany({ where: { lineItemId } });
    if (personIds.length > 0) {
      await tx.assignment.createMany({
        data: personIds.map((personId) => ({ lineItemId, personId })),
      });
    }
    return tx.assignment.findMany({ where: { lineItemId } });
  });

  return NextResponse.json({ assignments });
}
