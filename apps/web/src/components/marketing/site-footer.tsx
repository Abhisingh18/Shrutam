import Link from "next/link";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/pricing", label: "Pricing" },
      { href: "/solutions", label: "Solutions" },
      { href: "/demo", label: "Request a demo" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/careers", label: "Careers" },
      { href: "/blog", label: "Blog" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/docs", label: "Documentation" },
      { href: "/customers", label: "Customer stories" },
      { href: "/security", label: "Security" },
      { href: "/roadmap", label: "Roadmap" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms of service" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative border-t border-border bg-muted/30 overflow-hidden">
      <div
        className="absolute -bottom-40 left-1/2 -translate-x-1/2 size-[32rem] rounded-full bg-primary/[0.04] blur-3xl"
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-14 grid grid-cols-2 sm:grid-cols-5 gap-8">
        <div className="col-span-2 sm:col-span-1">
          <Link href="/" className="inline-flex items-center gap-2 font-display font-semibold text-foreground">
            <span className="inline-flex size-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs font-bold shadow-sm shadow-primary/30">
              S
            </span>
            Sutram
          </Link>
          <p className="text-xs text-muted-foreground mt-3 max-w-[16rem] leading-relaxed">
            The AI Education Operating System, by Pragyaan Labs.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-semibold text-foreground mb-3">{col.title}</h3>
            <ul className="space-y-2.5">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span className="relative">
                      {link.label}
                      <span className="absolute inset-x-0 -bottom-0.5 h-px bg-foreground scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="relative border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Pragyaan Labs. All rights reserved.</span>
          <span>Sutram — the AI Education Operating System</span>
        </div>
      </div>
    </footer>
  );
}
