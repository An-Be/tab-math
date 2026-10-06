import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSplitOwner } from "@/lib/require-split-owner";

const addPersonSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireSplitOwner(id);
  if ("error" in result) return result.error;

  const body = await request.json().catch(() => null);
  const parsed = addPersonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const person = await prisma.person.create({
    data: { splitId: id, name: parsed.data.name },
  });

  return NextResponse.json({ person }, { status: 201 });
}
