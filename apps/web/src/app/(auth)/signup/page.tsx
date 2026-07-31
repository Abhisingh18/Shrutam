"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { WizardTemplate, type WizardStep } from "@/components/templates/wizard-template";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { TenantSignupInput, TenantSignupResponse, TokenPairResponse } from "@/types/auth";

const INSTITUTION_TYPES: { value: TenantSignupInput["institution_type"]; label: string }[] = [
  { value: "school", label: "School" },
  { value: "college", label: "College" },
  { value: "university", label: "University" },
  { value: "coaching", label: "Coaching institute" },
  { value: "research_lab", label: "Research lab" },
];

const PLANS: { value: TenantSignupInput["plan_tier"]; label: string; blurb: string }[] = [
  { value: "starter", label: "Starter", blurb: "Up to 1,000 students, 1 campus" },
  { value: "growth", label: "Growth", blurb: "Up to 10,000 students, up to 3 campuses" },
  { value: "enterprise", label: "Enterprise", blurb: "Unlimited campuses, custom pricing" },
];

export default function SignupPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<TenantSignupInput>({
    institution_name: "",
    institution_type: "school",
    plan_tier: "starter",
    admin_full_name: "",
    admin_email: "",
    admin_password: "",
  });

  const update = <K extends keyof TenantSignupInput>(key: K, value: TenantSignupInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const stepValid = [
    form.institution_name.trim().length >= 2,
    Boolean(form.plan_tier),
    form.admin_full_name.trim().length >= 2 &&
      form.admin_email.includes("@") &&
      form.admin_password.length >= 10,
  ];

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const tenant = await apiFetch<TenantSignupResponse>("/tenants/signup", {
        method: "POST",
        body: form,
        skipTenant: true,
        skipAuth: true,
      });

      useAuthStore.getState().setSession({
        tenantId: tenant.tenant_id,
        accessToken: "",
        refreshToken: "",
      });

      const tokens = await apiFetch<TokenPairResponse>("/auth/login", {
        method: "POST",
        body: { email: form.admin_email, password: form.admin_password },
        skipAuth: true,
      });

      setSession({
        tenantId: tenant.tenant_id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      });

      toast.success(`${tenant.tenant_slug} workspace created`);
      router.push("/app/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  const steps: WizardStep[] = [
    {
      key: "institution",
      label: "Institution",
      content: (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Tell us about your institution</h2>
          <div>
            <Label htmlFor="institution_name">Institution name</Label>
            <Input
              id="institution_name"
              className="mt-1.5"
              value={form.institution_name}
              onChange={(e) => update("institution_name", e.target.value)}
              placeholder="Greenwood High School"
            />
          </div>
          <div>
            <Label htmlFor="institution_type">Institution type</Label>
            <Select
              value={form.institution_type}
              onValueChange={(v) => update("institution_type", v as TenantSignupInput["institution_type"])}
            >
              <SelectTrigger id="institution_type" className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INSTITUTION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ),
    },
    {
      key: "plan",
      label: "Plan",
      content: (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Choose a plan</h2>
          <p className="text-sm text-muted-foreground">
            You can change this anytime — see full details on{" "}
            <a href="/pricing" className="text-primary underline underline-offset-2">
              pricing
            </a>
            .
          </p>
          <div className="space-y-2">
            {PLANS.map((plan) => (
              <button
                key={plan.value}
                type="button"
                onClick={() => update("plan_tier", plan.value)}
                className={cn(
                  "w-full text-left rounded-lg border p-4 flex items-center justify-between transition-colors",
                  form.plan_tier === plan.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50",
                )}
              >
                <div>
                  <div className="font-medium text-foreground">{plan.label}</div>
                  <div className="text-xs text-muted-foreground">{plan.blurb}</div>
                </div>
                {form.plan_tier === plan.value && <Check className="size-4 text-primary" />}
              </button>
            ))}
          </div>
        </div>
      ),
    },
    {
      key: "admin",
      label: "Admin account",
      content: (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Create your admin account</h2>
          <div>
            <Label htmlFor="admin_full_name">Your full name</Label>
            <Input
              id="admin_full_name"
              className="mt-1.5"
              value={form.admin_full_name}
              onChange={(e) => update("admin_full_name", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="admin_email">Work email</Label>
            <Input
              id="admin_email"
              type="email"
              className="mt-1.5"
              value={form.admin_email}
              onChange={(e) => update("admin_email", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="admin_password">Password</Label>
            <Input
              id="admin_password"
              type="password"
              className="mt-1.5"
              value={form.admin_password}
              onChange={(e) => update("admin_password", e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">At least 10 characters</p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      ),
    },
  ];

  return (
    <div className="w-full max-w-lg">
      <WizardTemplate
        steps={steps}
        currentStepIndex={stepIndex}
        onBack={() => setStepIndex((i) => Math.max(0, i - 1))}
        onNext={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
        onSubmit={handleSubmit}
        isLastStepSubmitting={submitting}
        nextDisabled={!stepValid[stepIndex]}
        nextLabel={stepIndex === steps.length - 1 ? "Create workspace" : "Continue"}
      />
    </div>
  );
}
