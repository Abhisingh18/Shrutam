"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateRoute } from "@/hooks/use-routes";
import { useVehicles } from "@/hooks/use-vehicles";
import { ApiError } from "@/lib/api-client";

const schema = z.object({
  name: z.string().min(1, "Required"),
  vehicle_id: z.string().optional(),
  stops: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function NewRoutePage() {
  const router = useRouter();
  const createRoute = useCreateRoute();
  const { data: vehiclesData, isLoading: vehiclesLoading } = useVehicles({
    page: 1,
    pageSize: 100,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const route = await createRoute.mutateAsync({
        name: values.name,
        vehicle_id: values.vehicle_id || null,
        stops: values.stops || null,
      });
      toast.success(`Route ${route.name} added`);
      router.push(`/app/transport/${route.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add route");
    }
  });

  return (
    <FormPageTemplate
      title="Add route"
      description="Create a new transport route."
      onSubmit={onSubmit}
      onCancel={() => router.back()}
      submitLabel="Add route"
      submitting={createRoute.isPending}
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

export default function Page() {
  return (
    <RequirePermission permission="transport:route:write">
      <NewRoutePage />
    </RequirePermission>
  );
}
