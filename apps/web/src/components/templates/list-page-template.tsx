"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Reveal } from "@/components/shared/reveal";

interface ListPageTemplateProps {
  title: string;
  description?: string;
  primaryAction?: { label: string; onClick: () => void };
  search?: { value: string; onChange: (value: string) => void; placeholder?: string };
  toolbarExtra?: React.ReactNode;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  children: React.ReactNode;
}

/**
 * docs/11-figma-design-system.md §8 ListPageTemplate: header + toolbar
 * (search/filters/bulk actions) + content + pagination. Composes ~200+ of
 * the product's ~415 screens (docs/09-frontend-architecture.md handoff).
 */
export function ListPageTemplate({
  title,
  description,
  primaryAction,
  search,
  toolbarExtra,
  page,
  pageSize,
  total,
  onPageChange,
  children,
}: ListPageTemplateProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col h-full">
      <Reveal className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        {primaryAction && (
          <Button className="hover:-translate-y-0.5 transition-transform" onClick={primaryAction.onClick}>
            {primaryAction.label}
          </Button>
        )}
      </Reveal>

      {(search || toolbarExtra) && (
        <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-b border-border bg-muted/40">
          {search && (
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                placeholder={search.placeholder ?? "Search…"}
                className="pl-9"
              />
            </div>
          )}
          {toolbarExtra}
        </div>
      )}

      <div className="flex-1 overflow-auto px-6 py-4">{children}</div>

      <div className="flex items-center justify-between px-6 py-3 border-t border-border text-sm text-muted-foreground">
        <span>
          {total === 0
            ? "No results"
            : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
        </span>
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => page > 1 && onPageChange(page - 1)}
                className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink isActive>{page}</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={() => page < totalPages && onPageChange(page + 1)}
                className={
                  page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
