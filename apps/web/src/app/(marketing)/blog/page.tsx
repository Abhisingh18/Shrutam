import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
  description: "Product updates and notes from the Sutram team.",
};

export default function BlogPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-20">
      <h1 className="text-4xl font-semibold tracking-tight text-foreground">Blog</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        We&apos;re heads-down building. Product updates and engineering notes will start
        appearing here as we ship — check back soon, or{" "}
        <a href="/contact" className="text-primary underline underline-offset-2">
          get in touch
        </a>{" "}
        if you&apos;d like to be notified.
      </p>
    </div>
  );
}
