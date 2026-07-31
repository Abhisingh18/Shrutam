"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { TenantResolveResponse } from "@/types/tenant";
import type { TokenPairResponse } from "@/types/auth";

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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const tenant = await apiFetch<TenantResolveResponse>("/tenants/resolve", {
        params: { slug: values.institutionSlug },
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
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" className="mt-1.5" {...register("password")} />
            {errors.password && (
              <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
            )}
          </div>

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}

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
