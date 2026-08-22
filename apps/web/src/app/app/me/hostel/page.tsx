"use client";

import { useState } from "react";
import { AlertCircle, Building2, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ChildSelector } from "@/components/me/child-selector";
import { useMyHostelComplaints, useRaiseHostelComplaint } from "@/hooks/use-me-portal";
import { ApiError } from "@/lib/api-client";
import type { ComplaintCategory } from "@/types/hostel-complaint";

const CATEGORY_OPTIONS: { value: ComplaintCategory; label: string }[] = [
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" },
  { value: "furniture", label: "Furniture" },
  { value: "cleanliness", label: "Cleanliness" },
  { value: "internet", label: "Internet" },
  { value: "other", label: "Other" },
];

const STATUS_CONFIG = {
  open: { label: "Open", icon: AlertCircle, className: "bg-warning-bg text-warning" },
  in_progress: { label: "In progress", icon: Clock, className: "bg-info-bg text-info" },
  resolved: { label: "Resolved", icon: CheckCircle2, className: "bg-success-bg text-success" },
};

export default function MyHostelPage() {
  const [studentId, setStudentId] = useState<string | undefined>();
  const { data: complaints, isLoading } = useMyHostelComplaints(studentId);
  const raiseComplaint = useRaiseHostelComplaint(studentId);

  const [category, setCategory] = useState<ComplaintCategory>("electrical");
  const [description, setDescription] = useState("");

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error("Describe the issue first");
      return;
    }
    try {
      await raiseComplaint.mutateAsync({ category, description });
      toast.success("Complaint raised");
      setDescription("");
    } catch (err) {
      const message =
        err instanceof ApiError && err.code === "no_active_allocation"
          ? "You don't have an active hostel room allocation."
          : err instanceof ApiError
            ? err.message
            : "Failed to raise complaint";
      toast.error(message);
    }
  };

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">My Hostel</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Raise a maintenance complaint about your room and track its status.
        </p>
        <div className="mt-3">
          <ChildSelector selectedId={studentId} onSelect={setStudentId} />
        </div>
      </div>

      {studentId && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 max-w-xl">
          <h2 className="text-sm font-semibold text-foreground">Raise a complaint</h2>
          <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3">
            <Select value={category} onValueChange={(v) => setCategory(v as ComplaintCategory)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue…"
              rows={2}
            />
          </div>
          <Button onClick={handleSubmit} disabled={raiseComplaint.isPending} size="sm">
            {raiseComplaint.isPending ? "Submitting…" : "Submit complaint"}
          </Button>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Your complaints</h2>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}
        {!isLoading && (complaints?.length ?? 0) === 0 && (
          <div className="rounded-lg border border-dashed border-border p-10 text-center">
            <Building2 className="size-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No complaints raised yet.</p>
          </div>
        )}
        <div className="space-y-2">
          {complaints?.map((c) => {
            const config = STATUS_CONFIG[c.status];
            const Icon = config.icon;
            return (
              <div
                key={c.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card p-4"
              >
                <div className="min-w-0">
                  <div className="font-medium text-foreground capitalize">{c.category}</div>
                  <p className="text-sm text-muted-foreground mt-0.5">{c.description}</p>
                  <div className="text-xs text-muted-foreground mt-1.5">
                    Raised {c.raised_date}
                    {c.resolution_notes && <> · {c.resolution_notes}</>}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium shrink-0 ${config.className}`}
                >
                  <Icon className="size-3.5" />
                  {config.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
