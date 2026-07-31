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
import { useStudent, useUpdateStudent } from "@/hooks/use-students";
import { ApiError } from "@/lib/api-client";

const schema = z.object({
  full_name: z.string().min(1, "Required"),
  email: z.email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  status: z.enum(["active", "inactive", "graduated", "transferred", "expelled"]),
});

type FormValues = z.infer<typeof schema>;

function EditStudentPage({ id }: { id: string }) {
  const router = useRouter();
  const { data: student, isLoading } = useStudent(id);
  const updateStudent = useUpdateStudent(id);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (student) {
      reset({
        full_name: student.full_name,
        email: student.email ?? "",
        phone: student.phone ?? "",
        status: student.status,
      });
    }
  }, [student, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateStudent.mutateAsync({
        full_name: values.full_name,
        email: values.email || null,
        phone: values.phone || null,
        status: values.status,
      });
      toast.success("Student updated");
      router.push(`/app/students/${id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update student");
    }
  });

  if (isLoading || !student) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full max-w-2xl" />
      </div>
    );
  }

  return (
    <FormPageTemplate
      title={`Edit ${student.full_name}`}
      description={`Admission #${student.admission_number}`}
      onSubmit={onSubmit}
      onCancel={() => router.back()}
      submitLabel="Save changes"
      submitting={updateStudent.isPending}
    >
      <FormSection title="Identity">
        <FormField label="Full name" htmlFor="full_name" error={errors.full_name?.message}>
          <Input id="full_name" {...register("full_name")} />
        </FormField>
        <FormField label="Status" htmlFor="status">
          <Select value={watch("status")} onValueChange={(v) => setValue("status", v as FormValues["status"])}>
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="graduated">Graduated</SelectItem>
              <SelectItem value="transferred">Transferred</SelectItem>
              <SelectItem value="expelled">Expelled</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </FormSection>

      <FormSection title="Contact">
        <FormField label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" {...register("email")} />
        </FormField>
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
    <RequirePermission permission="students:profile:write">
      <EditStudentPage id={id} />
    </RequirePermission>
  );
}
