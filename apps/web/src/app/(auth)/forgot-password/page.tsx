"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Mail, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { TenantResolveResponse } from "@/types/tenant";
import type { ForgotPasswordResponse } from "@/types/auth";

const schema = z.object({
  institutionSlug: z.string().min(2, "Enter your institution's slug"),
  email: z.email("Enter a valid email"),
});

type FormValues = z.infer<typeof schema>;

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<ForgotPasswordResponse | null>(null);
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { institutionSlug: searchParams.get("institution") ?? "" },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const tenant = await apiFetch<TenantResolveResponse>("/tenants/resolve", {
        params: { slug: values.institutionSlug.trim() },
        skipTenant: true,
        skipAuth: true,
      });

      useAuthStore.getState().setSession({
        tenantId: tenant.tenant_id,
        accessToken: "",
        refreshToken: "",
      });

      const response = await apiFetch<ForgotPasswordResponse>("/auth/password/forgot", {
        method: "POST",
        body: { email: values.email },
        skipAuth: true,
      });

      setTenantSlug(tenant.tenant_slug);
      setResult(response);
    } catch (err) {
      setServerError(
        err instanceof ApiError
          ? err.code === "not_found"
            ? "We couldn't find an institution with that slug."
            : err.message
          : "Something went wrong. Please try again.",
      );
    }
  };

  if (result) {
    const resetLink =
      result.dev_reset_token && tenantSlug
        ? `/reset-password?token=${encodeURIComponent(result.dev_reset_token)}&institution=${encodeURIComponent(tenantSlug)}`
        : null;

    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="inline-flex items-center justify-center size-10 rounded-full bg-success-bg text-success mb-2">
            <Mail className="size-5" />
          </div>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>{result.message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {resetLink && (
            <div className="rounded-lg border border-dashed border-warning-solid/40 bg-warning-bg/40 p-3 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-warning mb-1.5">
                <FlaskConical className="size-3.5" /> Development mode
              </div>
              <p className="text-muted-foreground mb-2">
                No email provider is wired up yet, so here&apos;s the reset link directly:
              </p>
              <Link href={resetLink} className="text-primary underline underline-offset-2 break-all">
                {resetLink}
              </Link>
            </div>
          )}
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Back to login
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Forgot password</CardTitle>
        <CardDescription>
          Enter your institution and email — we&apos;ll send a link to reset your password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="institutionSlug">Institution slug</Label>
            <Input
              id="institutionSlug"
              placeholder="e.g. greenwood-high-school"
              className="mt-1.5"
              {...register("institutionSlug")}
            />
            {errors.institutionSlug && (
              <p className="text-xs text-destructive mt-1">{errors.institutionSlug.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" className="mt-1.5" {...register("email")} />
            {errors.email && (
              <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Sending…" : "Send reset link"}
          </Button>
        </form>

        <Link
          href="/login"
          className="mt-6 flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to login
        </Link>
      </CardContent>
    </Card>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
