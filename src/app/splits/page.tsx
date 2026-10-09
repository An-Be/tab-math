import Link from "next/link";
import { NewSplitDialog } from "@/components/splits/new-split-dialog";
import { db } from "@/lib/server/db";
import { getCurrentActor } from "@/lib/server/get-current-actor";

export default async function SplitsPage() {
  const actor = await getCurrentActor();
  if (!actor) return null;

  const splits = await db.split.findMany({
    where: { userId: actor.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      mode: true,
      _count: { select: { people: true, items: true } },
      payments: { where: { status: "PAID" }, select: { id: true } },
    },
  });

  return (
    <div className="flex flex-col">
      {actor.isGuest && (
        <p className="mb-6 border border-ink px-3 py-2 text-xs leading-relaxed text-mute">
          You&apos;re using TabMath as a guest. Your splits live in this browser only.{" "}
          <Link href="/sign-up" className="text-ink underline underline-offset-2">
            Sign up
          </Link>{" "}
          to keep them if you clear cookies or switch devices.
        </p>
      )}

      <div className="flex items-end justify-between gap-4">
        <div>
          <span className="label text-mute">Dashboard</span>
          <h1 className="display text-3xl">Your splits</h1>
        </div>
        <NewSplitDialog />
      </div>

      {splits.length === 0 ? (
        <p className="mt-12 text-center text-sm text-mute">No splits yet. Create one to get started.</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {splits.map((split) => (
            <li key={split.id}>
              <Link
                href={`/split/${split.id}`}
                className="flex flex-col gap-3 border border-ink px-5 py-4 transition-colors hover:bg-wash"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-display text-lg font-medium tracking-[-0.02em]">{split.title}</span>
                  <span className="label border border-ink px-2 py-0.5">
                    {split.mode === "EVEN" ? "Even split" : "Itemized"}
                  </span>
                </span>
                <span className="label flex gap-4 text-mute">
                  <span>{split._count.people} people</span>
                  <span>{split._count.items} items</span>
                  {split._count.people > 0 && <span>{split._count.people - split.payments.length} outstanding</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
