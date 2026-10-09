import Link from "next/link";
import { FeatureInterestTeaser } from "@/components/landing/feature-interest";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
      <span className="label text-mute">No app · No login for friends · No money through us</span>
      <h1 className="display mt-6 max-w-lg text-5xl sm:text-6xl">
        Split the bill
        <br />
        in 60 seconds.
      </h1>
      <p className="mt-6 max-w-sm text-sm leading-relaxed text-mute">
        Snap the receipt, tap who had what, send everyone a link.
      </p>
      <Link href="/splits" className={buttonVariants({ size: "lg", className: "mt-10" })}>
        Start a split
      </Link>

      <FeatureInterestTeaser />
    </div>
  );
}
