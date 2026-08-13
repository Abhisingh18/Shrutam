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
import { useCreateVehicle } from "@/hooks/use-vehicles";
import { ApiError } from "@/lib/api-client";

// NOTE: `capacity` is declared as a plain z.number() (not z.coerce.number()) and the
// <input> is registered with `{ valueAsNumber: true }` below. Zod v4's z.coerce.number()
// produces an "unknown" input-type mismatch against react-hook-form's Resolver type when
// combined with @hookform/resolvers/zod + useForm<FormValues>() — this sidesteps it.
const schema = z.object({
  registration_number: z.string().min(1, "Required"),
  vehicle_type: z.string().min(1, "Required"),
  capacity: z.number().int().min(1, "Must be at least 1"),
  driver_name: z.string().optional(),
  driver_phone: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function NewVehiclePage() {
  const router = useRouter();
  const createVehicle = useCreateVehicle();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { capacity: 1 } });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const vehicle = await createVehicle.mutateAsync({
        registration_number: values.registration_number,
        vehicle_type: values.vehicle_type,
        capacity: values.capacity,
        driver_name: values.driver_name || null,
        driver_phone: values.driver_phone || null,
      });
      toast.success(`Vehicle ${vehicle.registration_number} added`);
      router.push("/app/transport/vehicles");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add vehicle");
    }
  });

  return (
    <FormPageTemplate
      title="Add vehicle"
      description="Register a new vehicle in the transport fleet."
      onSubmit={onSubmit}
      onCancel={() => router.back()}
      submitLabel="Add vehicle"
      submitting={createVehicle.isPending}
    >
      <FormSection title="Details">
        <FormField
          label="Registration number"
          htmlFor="registration_number"
          error={errors.registration_number?.message}
        >
          <Input id="registration_number" {...register("registration_number")} />
        </FormField>
        <FormField label="Vehicle type" htmlFor="vehicle_type" error={errors.vehicle_type?.message}>
          <Input id="vehicle_type" placeholder="bus / van" {...register("vehicle_type")} />
        </FormField>
        <FormField label="Capacity" htmlFor="capacity" error={errors.capacity?.message}>
          <Input
            id="capacity"
            type="number"
            min={1}
            {...register("capacity", { valueAsNumber: true })}
          />
        </FormField>
        <FormField label="Driver name" htmlFor="driver_name" error={errors.driver_name?.message}>
          <Input id="driver_name" {...register("driver_name")} />
        </FormField>
        <FormField
          label="Driver phone"
          htmlFor="driver_phone"
          error={errors.driver_phone?.message}
        >
          <Input id="driver_phone" {...register("driver_phone")} />
        </FormField>
      </FormSection>
    </FormPageTemplate>
  );
}

export default function Page() {
  return (
    <RequirePermission permission="transport:vehicle:write">
      <NewVehiclePage />
    </RequirePermission>
  );
}
