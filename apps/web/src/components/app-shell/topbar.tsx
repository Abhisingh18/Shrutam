"use client";

import { useRouter } from "next/navigation";
import { Menu, Search, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuthStore } from "@/stores/auth-store";
import { useMe } from "@/hooks/use-me";
import { MobileNav } from "@/components/app-shell/mobile-nav";
import { NotificationBell } from "@/components/app-shell/notification-bell";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Topbar() {
  const router = useRouter();
  const clear = useAuthStore((s) => s.clear);
  const { data: me } = useMe();

  const handleLogout = () => {
    clear();
    router.push("/login");
  };

  return (
    <header className="h-14 border-b border-border bg-background/95 backdrop-blur-sm flex items-center gap-3 px-4 shadow-sm shadow-foreground/[0.02] z-10">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="lg:hidden">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <MobileNav />
        </SheetContent>
      </Sheet>

      <div className="flex-1 max-w-md relative hidden sm:block group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
        <input
          placeholder="Search students, faculty, invoices…"
          className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-1.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring/50 focus:border-ring"
        />
      </div>

      <div className="flex-1 sm:hidden" />

      <NotificationBell />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring transition-transform hover:scale-105">
            <Avatar className="size-8 ring-2 ring-transparent hover:ring-primary/20 transition-all">
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs font-semibold">
                {me ? initials(me.full_name) : "?"}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="font-medium">{me?.full_name ?? "…"}</div>
            <div className="text-xs font-normal text-muted-foreground">{me?.email}</div>
            <div className="text-xs font-normal text-muted-foreground capitalize">
              {me?.role.replace(/_/g, " ")}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="size-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
