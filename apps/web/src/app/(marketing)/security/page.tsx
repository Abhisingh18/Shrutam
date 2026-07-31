import type { Metadata } from "next";
import { ShieldCheck, Lock, FileSearch, Building } from "lucide-react";

export const metadata: Metadata = {
  title: "Security",
  description: "How Sutram isolates tenant data, encrypts it, and keeps an audit trail.",
};

const ITEMS = [
  {
    icon: Building,
    title: "Tenant isolation",
    body: "Every institution's data carries a tenant_id enforced by PostgreSQL Row-Level Security, not just application-layer checks — a request literally cannot read another tenant's rows, even if the application code had a bug.",
  },
  {
    icon: Lock,
    title: "Encryption",
    body: "TLS 1.3 in transit; encryption at rest for the database and object storage; field-level encryption for sensitive PII such as government IDs and bank details.",
  },
  {
    icon: ShieldCheck,
    title: "Access control",
    body: "Role-based access control across 18 roles, scoped further by campus/department/section where relevant, enforced at both the API and database layer.",
  },
  {
    icon: FileSearch,
    title: "Audit trail",
    body: "Authentication events, permission changes, financial transactions and grade changes are all logged to an append-only audit trail.",
  },
];

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-20">
      <h1 className="text-4xl font-semibold tracking-tight text-foreground">Security</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Sutram handles student records, grades and payments — data that has to be both useful
        and strictly isolated per institution. Here&apos;s how we approach that.
      </p>
      <div className="mt-12 space-y-8">
        {ITEMS.map((item) => (
          <div key={item.title} className="flex gap-4">
            <item.icon className="size-6 text-primary shrink-0 mt-1" />
            <div>
              <h2 className="font-medium text-foreground">{item.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-12 text-sm text-muted-foreground">
        Questions about compliance (GDPR, FERPA, India&apos;s DPDP Act) or a security
        questionnaire?{" "}
        <a href="/contact" className="text-primary underline underline-offset-2">
          Contact us
        </a>
        .
      </p>
    </div>
  );
}
