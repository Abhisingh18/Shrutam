import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Request a demo",
  description: "Book a walkthrough of Sutram with our team.",
};

export default function DemoPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-20 text-center">
      <h1 className="text-4xl font-semibold tracking-tight text-foreground">
        See Sutram on a screen share
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Tell us a bit about your institution and we&apos;ll walk you through the modules that
        matter most to you — admissions, exams, fees, or all of it.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <Button size="lg" asChild>
          <Link href="/contact">Request a demo</Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/signup">Or just start a free trial</Link>
        </Button>
      </div>
    </div>
  );
}
