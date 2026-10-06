import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { computeTotals } from "@/lib/totals";
import { buildPaymentOptions, type PaymentHandles } from "@/lib/payment-links";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentOptions } from "@/components/payer/payment-options";

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function PayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ shareToken: string }>;
  searchParams: Promise<{ as?: string }>;
}) {
  const { shareToken } = await params;
  const { as: selectedPersonId } = await searchParams;

  const split = await prisma.split.findUnique({
    where: { shareToken },
    include: { people: { orderBy: { createdAt: "asc" } }, items: true, user: true },
  });
  if (!split) notFound();

  const selectedPerson = selectedPersonId
    ? split.people.find((p) => p.id === selectedPersonId)
    : undefined;

  if (!selectedPerson) {
    return (
      <div className="mx-auto max-w-sm px-4 py-12 text-center">
        <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          {split.title}
        </span>
        <h1 className="mt-2 font-heading text-2xl font-medium tracking-tight">
          Who are you?
        </h1>
        <div className="mt-8 flex flex-col gap-2">
          {split.people.map((person) => (
            <Link
              key={person.id}
              href={`/p/${shareToken}?as=${person.id}`}
              className="block border border-foreground/15 px-4 py-3 text-left font-medium hover:bg-accent/50"
            >
              {person.name}
            </Link>
          ))}
          {split.people.length === 0 && (
            <p className="font-mono text-sm text-muted-foreground">
              No one&apos;s been added to this split yet.
            </p>
          )}
        </div>
      </div>
    );
  }

  const assignments = await prisma.assignment.findMany({
    where: { lineItem: { splitId: split.id } },
  });
  const payment = await prisma.payment.findUnique({
    where: { splitId_personId: { splitId: split.id, personId: selectedPerson.id } },
  });

  const totals = computeTotals({
    mode: split.mode,
    taxCents: split.taxCents,
    tipCents: split.tipCents,
    people: split.people.map((p) => ({ id: p.id })),
    items: split.items.map((i) => ({ id: i.id, priceCents: i.priceCents, quantity: i.quantity })),
    assignments: assignments.map((a) => ({ lineItemId: a.lineItemId, personId: a.personId })),
  });
  const amountCents = totals.people.find((pt) => pt.personId === selectedPerson.id)?.totalCents ?? 0;
  const isPaid = payment?.status === "PAID";

  const options = buildPaymentOptions(split.user.paymentHandles as PaymentHandles);

  return (
    <div className="mx-auto max-w-sm px-4 py-12 text-center">
      <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
        {split.title}
      </span>
      <p className="mt-2 text-muted-foreground">Hey {selectedPerson.name}, you owe</p>
      <p className="mt-1 font-heading text-5xl font-medium tracking-tight tabular-nums">
        {fmt(amountCents)}
      </p>

      {isPaid ? (
        <p className="mt-8 font-mono text-sm tracking-wide text-muted-foreground uppercase">
          Already marked paid — thanks!
        </p>
      ) : (
        <Card className="mt-8 rounded-none border-foreground/15 text-left">
          <CardHeader>
            <CardTitle className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
              Pay the organizer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentOptions options={options} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
