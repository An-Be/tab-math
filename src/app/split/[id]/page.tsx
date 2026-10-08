import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SplitWorkspace } from "@/components/splits/split-workspace";
import type { PaymentHandles } from "@/lib/payment-links";
import { db } from "@/lib/server/db";
import { getCurrentActor } from "@/lib/server/get-current-actor";
import { computeTotals } from "@/lib/totals";

export default async function SplitPage({ params }: PageProps<"/split/[id]">) {
  const { id } = await params;
  const actor = await getCurrentActor();
  if (!actor) notFound();

  const split = await db.split.findUnique({
    where: { id },
    include: {
      people: { orderBy: { createdAt: "asc" } },
      items: { orderBy: { sortOrder: "asc" } },
      payments: true,
    },
  });

  if (!split || split.userId !== actor.id) notFound();

  const [assignments, owner] = await Promise.all([
    db.assignment.findMany({ where: { lineItem: { splitId: id } } }),
    db.user.findUnique({ where: { id: split.userId } }),
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
    <div className="flex flex-col">
      <Link href="/splits" className="label inline-flex items-center gap-1 self-start text-mute hover:text-ink">
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Your splits
      </Link>

      <h1 className="display mt-3 break-words text-4xl">{split.title}</h1>
      {split.restaurantName && <p className="mt-2 text-sm text-mute">{split.restaurantName}</p>}

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
