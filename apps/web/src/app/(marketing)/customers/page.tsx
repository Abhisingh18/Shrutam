import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customer stories",
  description: "Institutions running on Sutram.",
};

export default function CustomersPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-20">
      <h1 className="text-4xl font-semibold tracking-tight text-foreground">Customer stories</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        We&apos;re early — our first pilot institutions are onboarding now. Customer stories
        will go here once we have them to tell properly, with their permission.
      </p>
    </div>
  );
}
