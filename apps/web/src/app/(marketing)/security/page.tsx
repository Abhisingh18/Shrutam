import type { Metadata } from "next";
import { ShieldCheck, Lock, FileSearch, Building, ShieldHalf } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "Security",
  description: "How Sutram isolates tenant data, encrypts it, and keeps an audit trail.",
};

const ITEMS = [
  {
    icon: Building,
    title: "Tenant isolation",
    body: "Every institution's data carries a tenant_id enforced by PostgreSQL Row-Level Security, not just application-layer checks — a request literally cannot read another tenant's rows, even if the application code had a bug.",
    box: "bg-primary/10 text-primary",
  },
  {
    icon: Lock,
    title: "Encryption",
    body: "TLS 1.3 in transit; encryption at rest for the database and object storage; field-level encryption for sensitive PII such as government IDs and bank details.",
    box: "bg-chart-1/10 text-chart-1",
  },
  {
    icon: ShieldCheck,
    title: "Access control",
    body: "Role-based access control across 18 roles, scoped further by campus/department/section where relevant, enforced at both the API and database layer.",
    box: "bg-chart-2/10 text-chart-2",
  },
  {
    icon: FileSearch,
    title: "Audit trail",
    body: "Authentication events, permission changes, financial transactions and grade changes are all logged to an append-only audit trail.",
    box: "bg-accent/10 text-accent",
  },
];

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-20">
      <Reveal>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-medium text-primary mb-6">
          <ShieldHalf className="size-3.5" />
          Enterprise-grade by default
        </span>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">Security</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Sutram handles student records, grades and payments — data that has to be both useful
          and strictly isolated per institution. Here&apos;s how we approach that.
        </p>
      </Reveal>
      <div className="mt-12 space-y-4">
        {ITEMS.map((item, i) => (
          <Reveal key={item.title} delay={i * 90}>
            <div className="flex gap-4 rounded-xl border border-border bg-card p-5 hover:border-primary/20 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
              <div className={`inline-flex items-center justify-center size-11 rounded-xl shrink-0 group-hover:scale-110 transition-transform duration-300 ${item.box}`}>
                <item.icon className="size-5" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-foreground">{item.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{item.body}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal delay={ITEMS.length * 90} className="mt-10">
        <p className="text-sm text-muted-foreground">
          Questions about compliance (GDPR, FERPA, India&apos;s DPDP Act) or a security
          questionnaire?{" "}
          <a href="/contact" className="text-primary underline underline-offset-2 hover:text-primary/80">
            Contact us
          </a>
          .
        </p>
      </Reveal>
    </div>
  );
}
