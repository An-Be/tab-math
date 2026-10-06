import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FeatureInterestTeaser } from "@/components/landing/feature-interest";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
        No app · No login for friends · No money through us
      </span>
      <h1 className="mt-6 max-w-lg font-heading text-5xl leading-[0.95] font-medium tracking-tight sm:text-6xl">
        Split the bill
        <br />
        in 60 seconds.
      </h1>
      <p className="mt-6 max-w-sm text-lg text-muted-foreground">
        Snap the receipt, tap who had what, send everyone a link.
      </p>
      <Button
        render={<Link href="/splits" />}
        nativeButton={false}
        size="lg"
        className="mt-10 font-mono text-xs tracking-wide uppercase"
      >
        Start a split
      </Button>

      <FeatureInterestTeaser />
    </div>
  );
}
