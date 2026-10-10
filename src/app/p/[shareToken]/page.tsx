import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PaymentOptions } from "@/components/payer/payment-options";
import { site } from "@/config/site";
import { buildPaymentOptions, type PaymentHandles } from "@/lib/payment-links";
import { db } from "@/lib/server/db";
import { isWellFormedToken } from "@/lib/server/token";
import { computeTotals } from "@/lib/totals";

// The payer view: public, no login, reached only through the share link.
// It renders the split title, first names for the picker, and only once a
// person is chosen, that one person's total and sanitized payment options.
// Never pass the organizer's email or id, other people's amounts, or the item
// list across to a client component.

// Generic title so link previews never show the split's name.
export const metadata: Metadata = { title: site.name, robots: { index: false, follow: false } };

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function PayerPage({ params, searchParams }: PageProps<"/p/[shareToken]">) {
  const { shareToken } = await params;
  const { as } = await searchParams;
  const selectedPersonId = typeof as === "string" ? as : undefined;
  if (!isWellFormedToken(shareToken)) notFound();

  const split = await db.split.findUnique({
    where: { shareToken },
    select: {
      id: true,
      title: true,
      mode: true,
      taxCents: true,
      tipCents: true,
      people: { orderBy: { createdAt: "asc" }, select: { id: true, name: true } },
      items: { select: { id: true, priceCents: true, quantity: true } },
      user: { select: { paymentHandles: true } },
    },
  });
  if (!split) notFound();

  const selectedPerson = selectedPersonId ? split.people.find((p) => p.id === selectedPersonId) : undefined;

  if (!selectedPerson) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col py-4 text-center">
        <span className="label text-mute">{split.title}</span>
        <h1 className="display mt-3 text-4xl">Who are you?</h1>
        <div className="mt-8 flex flex-col">
          {split.people.map((person, i) => (
            <Link
              key={person.id}
              href={`/p/${shareToken}?as=${person.id}`}
              className={`block border border-ink px-4 py-4 text-left font-display text-lg font-medium tracking-[-0.02em] hover:bg-wash ${i > 0 ? "-mt-px" : ""}`}
            >
              {person.name}
            </Link>
          ))}
          {split.people.length === 0 && <p className="text-sm text-mute">No one&apos;s been added to this split yet.</p>}
        </div>
      </div>
    );
  }

  const [assignments, payment] = await Promise.all([
    db.assignment.findMany({
      where: { lineItem: { splitId: split.id } },
      select: { lineItemId: true, personId: true },
    }),
    db.payment.findUnique({
      where: { splitId_personId: { splitId: split.id, personId: selectedPerson.id } },
      select: { status: true },
    }),
  ]);

  const totals = computeTotals({
    mode: split.mode,
    taxCents: split.taxCents,
    tipCents: split.tipCents,
    people: split.people.map((p) => ({ id: p.id })),
    items: split.items,
    assignments,
  });
  const amountCents = totals.people.find((pt) => pt.personId === selectedPerson.id)?.totalCents ?? 0;
  const isPaid = payment?.status === "PAID";
  const options = buildPaymentOptions(split.user.paymentHandles as PaymentHandles);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col py-4 text-center">
      <span className="label text-mute">{split.title}</span>
      <p className="mt-3 text-sm text-mute">Hey {selectedPerson.name}, you owe</p>
      <p className="display mt-2 text-6xl tabular-nums">{fmt(amountCents)}</p>

      {isPaid ? (
        <p className="label mt-8 text-mute">Already marked paid. Thanks!</p>
      ) : (
        <section className="mt-8 border border-ink p-5 text-left">
          <p className="label mb-4 text-mute">Pay the organizer</p>
          <PaymentOptions options={options} />
        </section>
      )}
    </div>
  );
}
