"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const FEATURE = "self-claim-items";
const STORAGE_KEY = `feature-interest:${FEATURE}`;

export function FeatureInterestTeaser() {
  const [voted, setVoted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Must run post-mount, not during a lazy useState initializer: this
    // component is server-rendered too, and localStorage doesn't exist
    // there. Reading it synchronously at initial state would make the
    // server's "not voted" render mismatch the client's real value on
    // hydration for anyone who'd already voted.
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(STORAGE_KEY)) setVoted(true);
    } catch {
      // localStorage can throw in a private window — fine to just not remember.
    }
  }, []);

  async function handleClick() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/feature-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature: FEATURE }),
      });
      if (!res.ok) throw new Error();
      setVoted(true);
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        // best-effort only
      }
      toast.success("Vote counted, thanks.");
    } catch {
      toast.error("Couldn't record that, try again later");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-20 max-w-sm border border-foreground/15 px-5 py-4 text-center">
      <p className="text-sm font-medium">Claim your own items</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Right now the organizer assigns every item by hand. The idea:
        everyone opens the link and taps what they had. Less work, fewer
        mistakes about who had the salmon.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3 font-mono text-xs tracking-wide uppercase"
        disabled={voted || submitting}
        onClick={handleClick}
      >
        {voted ? "Voted" : "I want this"}
      </Button>
    </div>
  );
}
