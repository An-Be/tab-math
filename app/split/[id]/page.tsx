import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentActor } from "@/lib/get-current-actor";
import { computeTotals } from "@/lib/totals";
import type { PaymentHandles } from "@/lib/payment-links";
import { SplitWorkspace } from "@/components/splits/split-workspace";

export default async function SplitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await getCurrentActor();
  if (!actor) notFound();

  const split = await prisma.split.findUnique({
    where: { id },
    include: {
      people: { orderBy: { createdAt: "asc" } },
      items: { orderBy: { sortOrder: "asc" } },
      payments: true,
    },
  });

  if (!split || split.userId !== actor.id) notFound();

  const [assignments, owner] = await Promise.all([
    prisma.assignment.findMany({ where: { lineItem: { splitId: id } } }),
    prisma.user.findUnique({ where: { id: split.userId } }),
  ]);

  const totals = computeTotals({
    mode: split.mode,
    taxCents: split.taxCents,
    tipCents: split.tipCents,
    people: split.people.map((p) => ({ id: p.id })),
    items: split.items.map((i) => ({ id: i.id, priceCents: i.priceCents, quantity: i.quantity })),
    assignments: assignments.map((a) => ({ lineItemId: a.lineItemId, personId: a.personId })),
  });

  const initialTotals = {
    splitSubtotalCents: totals.splitSubtotalCents,
    splitTotalCents: totals.splitTotalCents,
    people: totals.people.map((pt) => ({
      ...pt,
      name: split.people.find((p) => p.id === pt.personId)?.name ?? "",
    })),
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/splits"
        className="inline-flex items-center gap-1 font-mono text-xs tracking-wide text-muted-foreground uppercase hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Your splits
      </Link>

      <h1 className="mt-2 font-heading text-2xl font-medium tracking-tight">
        {split.title}
      </h1>
      {split.restaurantName && (
        <p className="font-mono text-sm text-muted-foreground">
          {split.restaurantName}
        </p>
      )}

      <div className="mt-6">
        <SplitWorkspace
          splitId={split.id}
          shareToken={split.shareToken}
          receiptImageUrl={split.receiptImageUrl}
          initialItems={split.items}
          initialPeople={split.people}
          initialMode={split.mode}
          initialTaxCents={split.taxCents}
          initialTipCents={split.tipCents}
          initialAssignments={assignments}
          initialTotals={initialTotals}
          initialPayments={split.payments}
          paymentHandles={(owner?.paymentHandles ?? {}) as PaymentHandles}
        />
      </div>
    </div>
  );
}
