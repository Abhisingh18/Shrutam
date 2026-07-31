"use client";

import { Button } from "@/components/ui/button";

interface FormPageTemplateProps {
  title: string;
  description?: string;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitLabel?: string;
  submitting?: boolean;
  children: React.ReactNode;
}

/** docs/11-figma-design-system.md §8 FormPageTemplate: sectioned form + sticky save bar. */
export function FormPageTemplate({
  title,
  description,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  submitting = false,
  children,
}: FormPageTemplateProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-border">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>

      <div className="flex-1 overflow-auto px-6 py-6 max-w-2xl space-y-6">{children}</div>

      <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-background/95 backdrop-blur">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2">
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </section>
  );
}

export function FormField({
  label,
  htmlFor,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground mb-1.5">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
