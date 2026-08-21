"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from "@/hooks/use-notifications";
import type { Notification } from "@/types/notification";
import { cn } from "@/lib/utils";

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * Self-contained notification bell: drop-in replacement for the plain
 * `<Bell className="size-5" />` icon button currently in topbar.tsx. Sources
 * everything from its own hooks — no props required.
 *
 *   <Button variant="ghost" size="icon" aria-label="Notifications">
 *     <Bell className="size-5" />
 *   </Button>
 *
 * becomes simply:
 *
 *   <NotificationBell />
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const { data: unread } = useUnreadCount();
  const { data: list, isLoading } = useNotifications({ pageSize: 10 });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const count = unread?.count ?? 0;
  const notifications = list?.data ?? [];

  const handleSelect = (notification: Notification) => {
    if (notification.read_at === null) {
      markRead.mutate(notification.id);
    }
    setOpen(false);
    if (notification.link_url) {
      router.push(notification.link_url);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="size-5" />
          {count > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px] leading-none"
            >
              {count > 9 ? "9+" : count}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="font-medium text-sm">Notifications</span>
          {count > 0 && (
            <button
              type="button"
              className="text-xs text-primary hover:underline disabled:opacity-50 disabled:no-underline"
              disabled={markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
            >
              Mark all as read
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto border-t border-border">
          {isLoading ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No notifications yet
            </p>
          ) : (
            <ul>
              {notifications.map((notification) => {
                const isUnread = notification.read_at === null;
                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(notification)}
                      className={cn(
                        "flex w-full gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted transition-colors",
                        isUnread && "bg-primary/5"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-1.5 size-1.5 shrink-0 rounded-full",
                          isUnread ? "bg-primary" : "bg-transparent"
                        )}
                      />
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              "truncate",
                              isUnread ? "font-medium text-foreground" : "text-foreground/90"
                            )}
                          >
                            {notification.title}
                          </span>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {relativeTime(notification.created_at)}
                          </span>
                        </span>
                        {notification.body && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {notification.body}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
