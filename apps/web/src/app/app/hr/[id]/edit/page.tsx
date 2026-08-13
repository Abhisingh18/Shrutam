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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmployee, useUpdateEmployee } from "@/hooks/use-employees";
import { ApiError } from "@/lib/api-client";

const schema = z.object({
  full_name: z.string().min(1, "Required"),
  phone: z.string().optional(),
  designation: z.string().min(1, "Required"),
  status: z.enum(["active", "on_leave", "resigned", "terminated"]),
});

type FormValues = z.infer<typeof schema>;

function EditEmployeePage({ id }: { id: string }) {
  const router = useRouter();
  const { data: employee, isLoading } = useEmployee(id);
  const updateEmployee = useUpdateEmployee(id);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (employee) {
      reset({
        full_name: employee.full_name,
        phone: employee.phone ?? "",
        designation: employee.designation,
        status: employee.status,
      });
    }
  }, [employee, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateEmployee.mutateAsync({
        full_name: values.full_name,
        phone: values.phone || null,
        designation: values.designation,
        status: values.status,
      });
      toast.success("Employee updated");
      router.push(`/app/hr/${id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update employee");
    }
  });

  if (isLoading || !employee) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full max-w-2xl" />
      </div>
    );
  }

  return (
    <FormPageTemplate
      title={`Edit ${employee.full_name}`}
      description={employee.designation}
      onSubmit={onSubmit}
      onCancel={() => router.back()}
      submitLabel="Save changes"
      submitting={updateEmployee.isPending}
    >
      <FormSection title="Identity">
        <FormField label="Full name" htmlFor="full_name" error={errors.full_name?.message}>
          <Input id="full_name" {...register("full_name")} />
        </FormField>
        <FormField label="Designation" htmlFor="designation" error={errors.designation?.message}>
          <Input id="designation" {...register("designation")} />
        </FormField>
        <FormField label="Status" htmlFor="status">
          <Select value={watch("status")} onValueChange={(v) => setValue("status", v as FormValues["status"])}>
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on_leave">On leave</SelectItem>
              <SelectItem value="resigned">Resigned</SelectItem>
              <SelectItem value="terminated">Terminated</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </FormSection>

      <FormSection title="Contact">
        <FormField label="Phone" htmlFor="phone">
          <Input id="phone" {...register("phone")} />
        </FormField>
      </FormSection>
    </FormPageTemplate>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission permission="hr:employee:write">
      <EditEmployeePage id={id} />
    </RequirePermission>
  );
}
