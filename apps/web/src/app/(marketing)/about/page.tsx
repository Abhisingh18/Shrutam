import type { Metadata } from "next";
import { Reveal } from "@/components/shared/reveal";

export const metadata: Metadata = {
  title: "About",
  description: "Sutram is built by Pragyaan Labs to be the connective thread across every system an education institution runs.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-20">
      <Reveal>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">About Sutram</h1>
      </Reveal>
      <div className="mt-8 space-y-6 text-muted-foreground leading-relaxed">
        <Reveal delay={80}>
          <p>
            <strong className="text-foreground">Sutram</strong> comes from the Sanskrit word for
            &quot;thread&quot; or &quot;that which connects everything together.&quot; It&apos;s
            built by <strong className="text-foreground">Pragyaan Labs</strong> as an
            AI-native, multi-tenant Education Operating System — one platform spanning
            admissions, academics, examinations, finance, HR, library, hostel, transport,
            placement, research and communication for schools, colleges, universities, coaching
            institutes and research labs.
          </p>
        </Reveal>
        <Reveal delay={160}>
          <p>
            Most institutions run six to twelve disconnected tools — a fee-collection app here, a
            spreadsheet-based attendance register there, a separate exam portal, a separate HR
            system — each holding its own copy of the truth. Sutram exists because that
            fragmentation is a solvable problem: one platform, one student record, one source of
            truth, with AI woven into the workflows people already use rather than bolted on as a
            separate chatbot.
          </p>
        </Reveal>
        <Reveal delay={240}>
          <p>
            Every institution gets its own isolated tenant workspace, provisioned in minutes, with
            role-based dashboards for everyone from the institution admin to a parent checking a
            fee due-date.
          </p>
        </Reveal>
      </div>
    </div>
  );
}
