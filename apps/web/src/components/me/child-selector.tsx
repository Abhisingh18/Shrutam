"use client";

import { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyChildren } from "@/hooks/use-me-portal";

/**
 * Shared across the three /app/me/* pages. For a `student` this just shows
 * their own name (no picker, one child). For a `parent` with more than one
 * linked child it renders a Select; auto-picks the only child otherwise.
 */
export function ChildSelector({
  selectedId,
  onSelect,
}: {
  selectedId: string | undefined;
  onSelect: (studentId: string) => void;
}) {
  const { data: children, isLoading } = useMyChildren();

  useEffect(() => {
    if (!selectedId && children && children.length > 0) {
      onSelect(children[0].id);
    }
  }, [children, selectedId, onSelect]);

  if (isLoading) return <Skeleton className="h-9 w-56" />;

  if (!children || children.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No student record is linked to your account yet — ask your institution admin.
      </p>
    );
  }

  if (children.length === 1) {
    return <p className="text-sm text-muted-foreground">{children[0].full_name}</p>;
  }

  return (
    <Select value={selectedId} onValueChange={onSelect}>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Select a child…" />
      </SelectTrigger>
      <SelectContent>
        {children.map((child) => (
          <SelectItem key={child.id} value={child.id}>
            {child.full_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
