import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation",
  description: "Sutram product and API documentation.",
};

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-20">
      <h1 className="text-4xl font-semibold tracking-tight text-foreground">Documentation</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        In-product documentation and the public API reference are in progress alongside the
        product itself. In the meantime,{" "}
        <a href="/contact" className="text-primary underline underline-offset-2">
          reach out
        </a>{" "}
        and we&apos;ll point you to what you need.
      </p>
    </div>
  );
}
