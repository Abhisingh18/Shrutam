"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { TenantResolveResponse } from "@/types/tenant";

const schema = z
  .object({
    new_password: z.string().min(10, "At least 10 characters"),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
  });

type FormValues = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const institution = searchParams.get("institution");

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [tenantReady, setTenantReady] = useState(false);
  const [tenantError, setTenantError] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!institution) {
      setTenantError(true);
      return;
    }
    apiFetch<TenantResolveResponse>("/tenants/resolve", {
      params: { slug: institution },
      skipTenant: true,
      skipAuth: true,
    })
      .then((tenant) => {
        useAuthStore.getState().setSession({
          tenantId: tenant.tenant_id,
          accessToken: "",
          refreshToken: "",
        });
        setTenantReady(true);
      })
      .catch(() => setTenantError(true));
  }, [institution]);

  const onSubmit = async (values: FormValues) => {
    if (!token) {
      setServerError("This reset link is missing its token — request a new one.");
      return;
    }
    setServerError(null);
    try {
      await apiFetch<void>("/auth/password/reset", {
        method: "POST",
        body: { token, new_password: values.new_password },
        skipAuth: true,
      });
      toast.success("Password updated — log in with your new password.");
      router.push("/login");
    } catch (err) {
      setServerError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
      );
    }
  };

  if (!token || tenantError) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Invalid reset link</CardTitle>
          <CardDescription>
            This link is missing information or has expired — request a new one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" asChild>
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Set a new password</CardTitle>
        <CardDescription>Choose a new password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="new_password">New password</Label>
            <div className="relative mt-1.5">
              <Input
                id="new_password"
                type={showPassword ? "text" : "password"}
                className="pr-9"
                autoComplete="new-password"
                {...register("new_password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.new_password && (
              <p className="text-xs text-destructive mt-1">{errors.new_password.message}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">At least 10 characters</p>
          </div>
          <div>
            <Label htmlFor="confirm_password">Confirm password</Label>
            <Input
              id="confirm_password"
              type={showPassword ? "text" : "password"}
              className="mt-1.5"
              autoComplete="new-password"
              {...register("confirm_password")}
            />
            {errors.confirm_password && (
              <p className="text-xs text-destructive mt-1">{errors.confirm_password.message}</p>
            )}
          </div>

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}

          <Button type="submit" className="w-full" disabled={isSubmitting || !tenantReady}>
            {isSubmitting ? "Updating…" : "Update password"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
