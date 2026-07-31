import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col bg-muted/30">
      <header className="h-16 flex items-center px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
          <span className="inline-flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
            S
          </span>
          Sutram
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 pb-16">{children}</main>
    </div>
  );
}
