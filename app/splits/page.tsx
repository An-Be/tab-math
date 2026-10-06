import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentActor } from "@/lib/get-current-actor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewSplitDialog } from "@/components/splits/new-split-dialog";

export default async function SplitsPage() {
  const actor = await getCurrentActor();
  if (!actor) return null;

  const splits = await prisma.split.findMany({
    where: { userId: actor.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { people: true, items: true } },
      payments: { where: { status: "PAID" }, select: { id: true } },
    },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {actor.isGuest && (
        <p className="mb-6 border border-foreground/15 px-3 py-2 font-mono text-xs text-muted-foreground">
          You&apos;re using TabMath as a guest — your splits live in
          this browser only.{" "}
          <Link href="/sign-up" className="text-foreground underline underline-offset-2">
            Sign up
          </Link>{" "}
          to keep them if you clear cookies or switch devices.
        </p>
      )}

      <div className="flex items-center justify-between">
        <div>
          <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            Dashboard
          </span>
          <h1 className="font-heading text-2xl font-medium tracking-tight">
            Your splits
          </h1>
        </div>
        <NewSplitDialog />
      </div>

      {splits.length === 0 ? (
        <p className="mt-12 text-center font-mono text-sm text-muted-foreground">
          No splits yet. Create one to get started.
        </p>
      ) : (
        <div className="mt-8 flex flex-col gap-3">
          {splits.map((split) => (
            <Link key={split.id} href={`/split/${split.id}`}>
              <Card className="rounded-none border-foreground/15 transition-colors hover:bg-accent/50">
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="font-heading text-base font-medium">
                    {split.title}
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className="rounded-none font-mono text-[0.65rem] tracking-wide uppercase"
                  >
                    {split.mode === "EVEN" ? "Even split" : "Itemized"}
                  </Badge>
                </CardHeader>
                <CardContent className="flex gap-4 font-mono text-xs tracking-wide text-muted-foreground uppercase">
                  <span>{split._count.people} people</span>
                  <span>{split._count.items} items</span>
                  {split._count.people > 0 && (
                    <span>
                      {split._count.people - split.payments.length} outstanding
                    </span>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
