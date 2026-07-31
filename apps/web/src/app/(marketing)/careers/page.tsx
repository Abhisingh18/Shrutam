import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Careers",
  description: "Join Pragyaan Labs and help build the Education Operating System.",
};

export default function CareersPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-20">
      <h1 className="text-4xl font-semibold tracking-tight text-foreground">Careers</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        We&apos;re a small team building an unusually large product — an AI-native ERP that has
        to work for a 200-student school and a 50,000-student university alike. If that sounds
        like an interesting problem, we&apos;d like to hear from you.
      </p>
      <p className="mt-4 text-muted-foreground">
        We don&apos;t have open roles listed yet — reach out at{" "}
        <a href="mailto:careers@sutram.app" className="text-primary underline underline-offset-2">
          careers@sutram.app
        </a>{" "}
        and tell us what you&apos;d want to work on.
      </p>
    </div>
  );
}
