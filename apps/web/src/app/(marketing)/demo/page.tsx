import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/shared/reveal";

export const metadata: Metadata = {
  title: "Request a demo",
  description: "Book a walkthrough of Sutram with our team.",
};

export default function DemoPage() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern" aria-hidden />
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 size-[28rem] rounded-full bg-primary/10 blur-3xl animate-float-slow"
        aria-hidden
      />
      <Reveal className="relative mx-auto max-w-2xl px-4 sm:px-6 py-24 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-medium text-primary mb-6 shadow-sm shadow-primary/5">
          <CalendarClock className="size-3.5" />
          30-minute walkthrough
        </span>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight text-foreground text-balance leading-[1.1]">
          See Sutram on a screen share
        </h1>
        <p className="mt-5 text-lg text-muted-foreground text-pretty leading-relaxed">
          Tell us a bit about your institution and we&apos;ll walk you through the modules that
          matter most to you — admissions, exams, fees, or all of it.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" className="shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all" asChild>
            <Link href="/contact">Request a demo</Link>
          </Button>
          <Button size="lg" variant="outline" className="hover:-translate-y-0.5 transition-transform" asChild>
            <Link href="/signup">Or just start a free trial</Link>
          </Button>
        </div>
      </Reveal>
    </section>
  );
}
