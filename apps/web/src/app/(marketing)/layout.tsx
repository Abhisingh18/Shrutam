import { Sora } from "next/font/google";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

// Scoped to the marketing site only (via this layout's own font variable) —
// deliberately not wired into the shared --font-heading token the app
// dashboard's Card/Dialog/Sheet titles use, so this doesn't change anything
// outside the public site. See globals.css `.font-display` for the fallback.
const sora = Sora({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${sora.variable} flex flex-col min-h-dvh`}>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
