"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { RequirePermission } from "@/components/auth/require-permission";
import { FormPageTemplate, FormSection, FormField } from "@/components/templates/form-page-template";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateRoom } from "@/hooks/use-rooms";
import { useHostels } from "@/hooks/use-hostels";
import { ApiError } from "@/lib/api-client";

const schema = z.object({
  hostel_id: z.string().min(1, "Required"),
  room_number: z.string().min(1, "Required"),
  capacity: z.number().int().min(1, "Must be at least 1"),
});

type FormValues = z.infer<typeof schema>;

function NewRoomPage() {
  const router = useRouter();
  const createRoom = useCreateRoom();
  const { data: hostelsData, isLoading: hostelsLoading } = useHostels({ page: 1, pageSize: 100 });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { capacity: 1 } });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const room = await createRoom.mutateAsync({
        hostel_id: values.hostel_id,
        room_number: values.room_number,
        capacity: values.capacity,
      });
      toast.success(`Room ${room.room_number} added`);
      router.push(`/app/hostel/${room.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add room");
    }
  });

  return (
    <FormPageTemplate
      title="Add room"
      description="Create a new room within a hostel."
      onSubmit={onSubmit}
      onCancel={() => router.back()}
      submitLabel="Add room"
      submitting={createRoom.isPending}
    >
      <FormSection title="Details">
        <FormField label="Hostel" htmlFor="hostel_id" error={errors.hostel_id?.message}>
          <Select
            value={watch("hostel_id")}
            onValueChange={(v) => setValue("hostel_id", v, { shouldValidate: true })}
          >
            <SelectTrigger id="hostel_id" className="w-full">
              <SelectValue placeholder={hostelsLoading ? "Loading…" : "Select a hostel…"} />
            </SelectTrigger>
            <SelectContent>
              {hostelsData?.data.map((hostel) => (
                <SelectItem key={hostel.id} value={hostel.id}>
                  {hostel.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Room number" htmlFor="room_number" error={errors.room_number?.message}>
          <Input id="room_number" {...register("room_number")} />
        </FormField>
        <FormField label="Capacity" htmlFor="capacity" error={errors.capacity?.message}>
          <Input id="capacity" type="number" min={1} {...register("capacity", { valueAsNumber: true })} />
        </FormField>
      </FormSection>
    </FormPageTemplate>
  );
}

export default function Page() {
  return (
    <RequirePermission permission="hostel:room:write">
      <NewRoomPage />
    </RequirePermission>
  );
}
