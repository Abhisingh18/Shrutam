import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">
          Pricing that scales with your institution
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Pay per student, per year. No implementation fees to get started, no long-term
          lock-in.
        </p>
      </div>

      <div className="mt-16 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              "rounded-xl border p-6 flex flex-col",
              plan.highlighted
                ? "border-primary shadow-lg shadow-primary/10 relative"
                : "border-border",
            )}
          >
            {plan.highlighted && (
              <span className="absolute -top-3 left-6 rounded-full bg-primary text-primary-foreground text-xs font-medium px-3 py-1">
                Most popular
              </span>
            )}
            <h2 className="font-semibold text-foreground text-lg">{plan.name}</h2>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-semibold text-foreground">{plan.price}</span>
              <span className="text-sm text-muted-foreground">{plan.unit}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{plan.note}</p>

            <ul className="mt-6 space-y-2.5 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="size-4 text-success shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <Button
              className="mt-6"
              variant={plan.highlighted ? "default" : "outline"}
              asChild
            >
              <Link href={plan.cta === "Talk to sales" ? "/contact" : "/signup"}>
                {plan.cta}
              </Link>
            </Button>
          </div>
        ))}
      </div>

      <p className="mt-12 text-center text-sm text-muted-foreground">
        Need add-ons like AI Analytics, Placement, Research or extra campuses? They&apos;re
        available à la carte on any plan —{" "}
        <Link href="/contact" className="text-primary underline underline-offset-2">
          talk to us
        </Link>
        .
      </p>
    </div>
  );
}
