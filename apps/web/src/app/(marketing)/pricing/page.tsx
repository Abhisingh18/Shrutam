import type { Metadata } from "next";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/shared/reveal";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple, per-student pricing that scales with your institution — Starter, Growth and Enterprise plans.",
};

const PLANS = [
  {
    name: "Starter",
    price: "₹199",
    unit: "/ student / year",
    note: "Minimum ₹75,000/year · up to 1,000 students · 1 campus",
    features: [
      "Admissions, Students, Faculty",
      "Attendance, Fees, Exams & Results",
      "Basic AI chatbot (FAQ)",
      "Email support",
    ],
    cta: "Start free trial",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "₹399",
    unit: "/ student / year",
    note: "Minimum ₹3.5L/year · up to 10,000 students · up to 3 campuses",
    features: [
      "Everything in Starter",
      "HR, Library, Hostel, Transport",
      "Analytics & Parent Portal",
      "AI-drafted communications & risk scoring",
      "Priority support",
    ],
    cta: "Start free trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    unit: "",
    note: "Unlimited campuses · dedicated isolation available",
    features: [
      "Everything in Growth",
      "Full AI Assistant, Placement, Research",
      "Multi-campus, workflow automation",
      "SSO/SAML, 24/7 support",
      "Dedicated deployment option",
    ],
    cta: "Talk to sales",
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <>
      {/* ───────────────────────── Hero ───────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern" aria-hidden />
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 size-[30rem] rounded-full bg-primary/10 blur-3xl animate-float-slow"
          aria-hidden
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-20 pb-16 sm:pt-28 sm:pb-20">
          <Reveal className="max-w-2xl mx-auto text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-medium text-primary mb-6 shadow-sm shadow-primary/5">
              <Sparkles className="size-3.5" />
              No implementation fees
            </span>
            <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight text-foreground text-balance leading-[1.1]">
              Pricing that scales{" "}
              <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                with your institution
              </span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground text-pretty leading-relaxed">
              Pay per student, per year. No implementation fees to get started, no long-term
              lock-in.
            </p>
          </Reveal>

          <div className="mt-16 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
            {PLANS.map((plan, i) => (
              <Reveal key={plan.name} delay={i * 100} className="h-full">
                <div
                  className={cn(
                    "group h-full rounded-2xl border p-7 flex flex-col relative transition-all duration-300",
                    plan.highlighted
                      ? "border-primary/40 bg-gradient-to-b from-primary/[0.04] to-card shadow-xl shadow-primary/10 lg:-translate-y-3 hover:-translate-y-4"
                      : "border-border bg-card hover:border-foreground/20 hover:shadow-lg hover:shadow-foreground/5 hover:-translate-y-1",
                  )}
                >
                  {plan.highlighted && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary text-primary-foreground text-xs font-semibold px-3.5 py-1.5 shadow-lg shadow-primary/30 whitespace-nowrap">
                      Most popular
                    </span>
                  )}
                  <h2 className="font-display font-semibold text-foreground text-lg">{plan.name}</h2>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="font-display text-4xl font-bold text-foreground tabular-nums">
                      {plan.price}
                    </span>
                    <span className="text-sm text-muted-foreground">{plan.unit}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{plan.note}</p>

                  <ul className="mt-7 space-y-3 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                        <span
                          className={cn(
                            "inline-flex items-center justify-center size-5 rounded-full shrink-0 mt-0.5",
                            plan.highlighted ? "bg-primary/15 text-primary" : "bg-success-bg text-success",
                          )}
                        >
                          <Check className="size-3" />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={cn(
                      "mt-7 transition-all duration-300",
                      plan.highlighted
                        ? "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
                        : "hover:-translate-y-0.5",
                    )}
                    variant={plan.highlighted ? "default" : "outline"}
                    asChild
                  >
                    <Link href={plan.cta === "Talk to sales" ? "/contact" : "/signup"}>
                      {plan.cta}
                    </Link>
                  </Button>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-16 text-center">
            <p className="text-sm text-muted-foreground">
              Need add-ons like AI Analytics, Placement, Research or extra campuses? They&apos;re
              available à la carte on any plan —{" "}
              <Link href="/contact" className="text-primary underline underline-offset-2 hover:text-primary/80">
                talk to us
              </Link>
              .
            </p>
          </Reveal>
        </div>
      </section>

      {/* ───────────────────────── CTA ───────────────────────── */}
      <section className="relative border-t border-border overflow-hidden bg-primary text-primary-foreground">
        <div
          className="absolute inset-0 bg-grid-pattern opacity-[0.08]"
          style={{ filter: "invert(1)" }}
          aria-hidden
        />
        <div
          className="absolute -bottom-32 left-1/2 -translate-x-1/2 size-[36rem] rounded-full bg-accent/20 blur-3xl"
          aria-hidden
        />
        <Reveal className="relative mx-auto max-w-7xl px-4 sm:px-6 py-20 sm:py-28 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-balance">
            Not sure which plan fits?
          </h2>
          <p className="mt-3 text-primary-foreground/80 max-w-xl mx-auto text-lg">
            Tell us your student count and modules you need — we&apos;ll recommend a plan in one call.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" variant="secondary" className="shadow-xl hover:-translate-y-0.5 transition-transform" asChild>
              <Link href="/signup">Start free trial</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:-translate-y-0.5 transition-transform"
              asChild
            >
              <Link href="/demo">Request a demo</Link>
            </Button>
          </div>
        </Reveal>
      </section>
    </>
  );
}
