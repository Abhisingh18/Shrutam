"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface WizardStep {
  key: string;
  label: string;
  content: React.ReactNode;
}

interface WizardTemplateProps {
  steps: WizardStep[];
  currentStepIndex: number;
  onBack: () => void;
  onNext: () => void;
  onSubmit?: () => void;
  isLastStepSubmitting?: boolean;
  nextLabel?: string;
  nextDisabled?: boolean;
}

/** docs/11-figma-design-system.md §8 WizardTemplate — signup + institution setup flow. */
export function WizardTemplate({
  steps,
  currentStepIndex,
  onBack,
  onNext,
  onSubmit,
  isLastStepSubmitting = false,
  nextLabel,
  nextDisabled = false,
}: WizardTemplateProps) {
  const isLastStep = currentStepIndex === steps.length - 1;
  const current = steps[currentStepIndex];

  return (
    <div className="flex flex-col min-h-full">
      <ol className="flex items-center justify-center gap-2 sm:gap-4 py-6 px-4 overflow-x-auto">
        {steps.map((step, index) => {
          const state =
            index < currentStepIndex ? "done" : index === currentStepIndex ? "active" : "todo";
          return (
            <li key={step.key} className="flex items-center gap-2 shrink-0">
              <div
                className={cn(
                  "size-7 rounded-full flex items-center justify-center text-xs font-medium border",
                  state === "done" && "bg-primary text-primary-foreground border-primary",
                  state === "active" && "border-primary text-primary",
                  state === "todo" && "border-border text-muted-foreground",
                )}
              >
                {state === "done" ? <Check className="size-3.5" /> : index + 1}
              </div>
              <span
                className={cn(
                  "text-sm hidden sm:inline",
                  state === "active" ? "text-foreground font-medium" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <div className="w-6 sm:w-10 h-px bg-border ml-1" />
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex-1 flex items-start justify-center px-4 pb-8">
        <div className="w-full max-w-md">{current?.content}</div>
      </div>

      <div className="sticky bottom-0 flex items-center justify-between px-6 py-4 border-t border-border bg-background/95 backdrop-blur">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={currentStepIndex === 0}
        >
          Back
        </Button>
        <Button
          type="button"
          size="lg"
          onClick={isLastStep ? onSubmit : onNext}
          disabled={nextDisabled || isLastStepSubmitting}
        >
          {isLastStep
            ? isLastStepSubmitting
              ? "Submitting…"
              : (nextLabel ?? "Finish")
            : (nextLabel ?? "Continue")}
        </Button>
      </div>
    </div>
  );
}
