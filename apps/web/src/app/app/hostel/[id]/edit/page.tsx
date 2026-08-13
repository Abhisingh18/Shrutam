"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { RequirePermission } from "@/components/auth/require-permission";
import { FormPageTemplate, FormSection, FormField } from "@/components/templates/form-page-template";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useRoom, useUpdateRoom } from "@/hooks/use-rooms";
import { ApiError } from "@/lib/api-client";

const schema = z.object({
  room_number: z.string().min(1, "Required"),
  capacity: z.number().int().min(1, "Must be at least 1"),
});

type FormValues = z.infer<typeof schema>;

function EditRoomPage({ id }: { id: string }) {
  const router = useRouter();
  const { data: room, isLoading } = useRoom(id);
  const updateRoom = useUpdateRoom(id);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (room) {
      reset({
        room_number: room.room_number,
        capacity: room.capacity,
      });
    }
  }, [room, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateRoom.mutateAsync({
        room_number: values.room_number,
        capacity: values.capacity,
      });
      toast.success("Room updated");
      router.push(`/app/hostel/${id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update room");
    }
  });

  if (isLoading || !room) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full max-w-2xl" />
      </div>
    );
  }

  return (
    <FormPageTemplate
      title={`Edit room ${room.room_number}`}
      description="Update room details."
      onSubmit={onSubmit}
      onCancel={() => router.back()}
      submitLabel="Save changes"
      submitting={updateRoom.isPending}
    >
      <FormSection title="Details">
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

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission permission="hostel:room:write">
      <EditRoomPage id={id} />
    </RequirePermission>
  );
}
