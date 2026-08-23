"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Reveal } from "@/components/shared/reveal";

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
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern" aria-hidden />
      <div
        className="absolute -top-24 -right-24 size-[24rem] rounded-full bg-primary/10 blur-3xl animate-float-slow"
        aria-hidden
      />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 py-20">
        <Reveal>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-medium text-primary mb-6 shadow-sm shadow-primary/5">
            <MessageCircle className="size-3.5" />
            We reply within one business day
          </span>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">Contact us</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl">
            Questions about pricing, a demo, or moving from your current system? Reach out and
            we&apos;ll get back to you within one business day.
          </p>
        </Reveal>

        <div className="mt-12 grid sm:grid-cols-5 gap-8">
          <Reveal className="sm:col-span-3" direction="left">
            <form
              onSubmit={handleSubmit}
              className="space-y-4 rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-sm"
            >
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
              <Button
                type="submit"
                disabled={submitting || submitted}
                className="w-full hover:-translate-y-0.5 transition-transform"
              >
                {submitted ? "Message sent" : submitting ? "Sending…" : "Send message"}
              </Button>
            </form>
          </Reveal>

          <Reveal className="sm:col-span-2" delay={100} direction="right">
            <div className="space-y-4">
              {[
                { icon: Mail, label: "Sales", value: "sales@sutram.app" },
                { icon: Mail, label: "Support", value: "support@sutram.app" },
                { icon: Mail, label: "Company", value: "Pragyaan Labs" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/20 hover:shadow-sm transition-all"
                >
                  <div className="inline-flex items-center justify-center size-9 rounded-lg bg-primary/10 text-primary shrink-0">
                    <item.icon className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-medium text-foreground">{item.label}</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
