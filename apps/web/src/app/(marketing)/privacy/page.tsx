import type { Metadata } from "next";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Pragyaan Labs handles data collected through Sutram.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-20">
      <Reveal>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Draft — last updated 2026-07-31</p>
      </Reveal>
      <Reveal delay={80}>
        <div className="mt-8 space-y-6 text-muted-foreground leading-relaxed text-sm">
          <p>
            This is a draft placeholder policy for the Sutram product scaffold. It is not yet
            reviewed by counsel and should not be relied on as a binding legal document. A
            finalized policy — covering data collected from institutions, staff, students and
            parents; retention; deletion rights under GDPR, FERPA and India&apos;s DPDP Act 2023;
            and sub-processor disclosures — will replace this page before general availability.
          </p>
          <p>
            In the meantime, questions about data handling can be sent to{" "}
            <a href="mailto:privacy@sutram.app" className="text-primary underline underline-offset-2 hover:text-primary/80">
              privacy@sutram.app
            </a>
            .
          </p>
        </div>
      </Reveal>
    </div>
  );
}
