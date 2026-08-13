"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { RequirePermission } from "@/components/auth/require-permission";
import {
  FormPageTemplate,
  FormSection,
  FormField,
} from "@/components/templates/form-page-template";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRoute, useUpdateRoute } from "@/hooks/use-routes";
import { useVehicles } from "@/hooks/use-vehicles";
import { ApiError } from "@/lib/api-client";

const schema = z.object({
  name: z.string().min(1, "Required"),
  vehicle_id: z.string().optional(),
  stops: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function EditRoutePage({ id }: { id: string }) {
  const router = useRouter();
  const { data: route, isLoading } = useRoute(id);
  const updateRoute = useUpdateRoute(id);
  const { data: vehiclesData, isLoading: vehiclesLoading } = useVehicles({
    page: 1,
    pageSize: 100,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (route) {
      reset({
        name: route.name,
        vehicle_id: route.vehicle_id ?? undefined,
        stops: route.stops ?? undefined,
      });
    }
  }, [route, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateRoute.mutateAsync({
        name: values.name,
        vehicle_id: values.vehicle_id || null,
        stops: values.stops || null,
      });
      toast.success("Route updated");
      router.push(`/app/transport/${id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update route");
    }
  });

  if (isLoading || !route) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full max-w-2xl" />
      </div>
    );
  }

  return (
    <FormPageTemplate
      title={`Edit route ${route.name}`}
      description="Update route details."
      onSubmit={onSubmit}
      onCancel={() => router.back()}
      submitLabel="Save changes"
      submitting={updateRoute.isPending}
    >
      <FormSection title="Details">
        <FormField label="Route name" htmlFor="name" error={errors.name?.message}>
          <Input id="name" {...register("name")} />
        </FormField>
        <FormField label="Vehicle" htmlFor="vehicle_id" error={errors.vehicle_id?.message}>
          <Select
            value={watch("vehicle_id")}
            onValueChange={(v) => setValue("vehicle_id", v, { shouldValidate: true })}
          >
            <SelectTrigger id="vehicle_id" className="w-full">
              <SelectValue placeholder={vehiclesLoading ? "Loading…" : "Select a vehicle…"} />
            </SelectTrigger>
            <SelectContent>
              {vehiclesData?.data.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.registration_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Stops" htmlFor="stops" error={errors.stops?.message} className="sm:col-span-2">
          <Textarea id="stops" placeholder="Comma-separated stop names" {...register("stops")} />
        </FormField>
      </FormSection>
    </FormPageTemplate>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission permission="transport:route:write">
      <EditRoutePage id={id} />
    </RequirePermission>
  );
}
