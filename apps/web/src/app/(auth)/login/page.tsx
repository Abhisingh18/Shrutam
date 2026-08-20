"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, Eye, EyeOff, Lock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { TenantResolveResponse } from "@/types/tenant";
import type { TokenPairResponse } from "@/types/auth";

const LAST_INSTITUTION_KEY = "sutram_last_institution_slug";

const schema = z.object({
  institutionSlug: z.string().min(2, "Enter your institution's slug"),
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [resolved, setResolved] = useState<TenantResolveResponse | null>(null);
  const [resolving, setResolving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const slug = watch("institutionSlug");

  // Remember the institution slug so returning users don't retype it.
  useEffect(() => {
    const saved = window.localStorage.getItem(LAST_INSTITUTION_KEY);
    if (saved) setValue("institutionSlug", saved);
  }, [setValue]);

  // Live-lookup as the user types — turns a blind text field into a
  // confirmed "yes, this is your school" preview before they even submit.
  useEffect(() => {
    setResolved(null);
    setNotFound(false);
    if (!slug || slug.trim().length < 2) return;

    setResolving(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const tenant = await apiFetch<TenantResolveResponse>("/tenants/resolve", {
          params: { slug: slug.trim() },
          skipTenant: true,
          skipAuth: true,
        });
        setResolved(tenant);
      } catch {
        setNotFound(true);
      } finally {
        setResolving(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [slug]);

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const tenant =
        resolved && resolved.tenant_slug === values.institutionSlug.trim()
          ? resolved
          : await apiFetch<TenantResolveResponse>("/tenants/resolve", {
              params: { slug: values.institutionSlug.trim() },
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
        body: { email: values.email, password: values.password },
        skipAuth: true,
      });

      setSession({
        tenantId: tenant.tenant_id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      });
      window.localStorage.setItem(LAST_INSTITUTION_KEY, tenant.tenant_slug);

      toast.success(`Welcome back to ${tenant.name}`);
      router.push("/app/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(
          err.code === "not_found"
            ? "We couldn't find an institution with that slug."
            : err.message,
        );
      } else {
        setServerError("Something went wrong. Please try again.");
      }
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Log in</CardTitle>
        <CardDescription>Access your institution&apos;s Sutram workspace</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="institutionSlug">Institution slug</Label>
            <div className="relative mt-1.5">
              <Input
                id="institutionSlug"
                placeholder="e.g. greenwood-high-school"
                className="pr-9"
                autoComplete="organization"
                {...register("institutionSlug")}
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                {resolving && (
                  <div className="size-3.5 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />
                )}
                {!resolving && resolved && <CheckCircle2 className="size-4 text-success" />}
                {!resolving && notFound && <XCircle className="size-4 text-destructive" />}
              </div>
            </div>
            {errors.institutionSlug && (
              <p className="text-xs text-destructive mt-1">{errors.institutionSlug.message}</p>
            )}
            {!errors.institutionSlug && resolved && (
              <p className="text-xs text-success mt-1">{resolved.name}</p>
            )}
            {!errors.institutionSlug && notFound && (
              <p className="text-xs text-muted-foreground mt-1">
                No institution found with that slug.
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              className="mt-1.5"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href={
                  resolved
                    ? `/forgot-password?institution=${encodeURIComponent(resolved.tenant_slug)}`
                    : "/forgot-password"
                }
                className="text-xs text-primary underline-offset-2 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative mt-1.5">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                className="pr-9"
                autoComplete="current-password"
                {...register("password")}
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
            {errors.password && (
              <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
            )}
          </div>

          {serverError && (
            <p className="flex items-start gap-1.5 text-sm text-destructive">
              <Lock className="size-4 shrink-0 mt-0.5" />
              {serverError}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Logging in…" : "Log in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New institution?{" "}
          <Link href="/signup" className="text-primary underline underline-offset-2">
            Start a free trial
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
