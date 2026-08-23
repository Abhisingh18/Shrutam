import type { Metadata } from "next";
import { Reveal } from "@/components/shared/reveal";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing use of Sutram.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-20">
      <Reveal>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Draft — last updated 2026-07-31</p>
      </Reveal>
      <Reveal delay={80}>
        <div className="mt-8 space-y-6 text-muted-foreground leading-relaxed text-sm">
          <p>
            This is a draft placeholder for the Sutram product scaffold, not yet reviewed by
            counsel. A finalized Terms of Service — covering the subscription tiers described on
            the{" "}
            <a href="/pricing" className="text-primary underline underline-offset-2 hover:text-primary/80">
              pricing page
            </a>
            , acceptable use, data ownership, and service-level commitments — will replace this
            page before general availability.
          </p>
          <p>
            Questions in the meantime can be sent to{" "}
            <a href="mailto:legal@sutram.app" className="text-primary underline underline-offset-2 hover:text-primary/80">
              legal@sutram.app
            </a>
            .
          </p>
        </div>
      </Reveal>
    </div>
  );
}
