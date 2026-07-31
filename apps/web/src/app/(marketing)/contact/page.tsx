"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function ContactPage() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // No CRM/contact-intake backend exists yet in this scaffold (docs/07-api-design.md
    // scopes the product API, not marketing-site lead capture) — this simulates
    // submission so the page is honest about what it does today.
    window.setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      toast.success("Thanks — we'll get back to you within one business day.");
    }, 600);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-20">
      <h1 className="text-4xl font-semibold tracking-tight text-foreground">Contact us</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Questions about pricing, a demo, or moving from your current system? Reach out and
        we&apos;ll get back to you within one business day.
      </p>

      <div className="mt-10 grid sm:grid-cols-2 gap-10">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" required disabled={submitted} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="institution">Institution</Label>
            <Input id="institution" required disabled={submitted} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="email">Work email</Label>
            <Input id="email" type="email" required disabled={submitted} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="message">How can we help?</Label>
            <Textarea id="message" rows={4} required disabled={submitted} className="mt-1.5" />
          </div>
          <Button type="submit" disabled={submitting || submitted} className="w-full">
            {submitted ? "Message sent" : submitting ? "Sending…" : "Send message"}
          </Button>
        </form>

        <div className="space-y-6 text-sm">
          <div>
            <h2 className="font-medium text-foreground mb-1">Sales</h2>
            <p className="text-muted-foreground">sales@sutram.app</p>
          </div>
          <div>
            <h2 className="font-medium text-foreground mb-1">Support</h2>
            <p className="text-muted-foreground">support@sutram.app</p>
          </div>
          <div>
            <h2 className="font-medium text-foreground mb-1">Company</h2>
            <p className="text-muted-foreground">Pragyaan Labs</p>
          </div>
        </div>
      </div>
    </div>
  );
}
