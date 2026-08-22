"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { useDepartments } from "@/hooks/use-departments";
import { useCreateSubject } from "@/hooks/use-subjects";
import { ApiError } from "@/lib/api-client";

const schema = z.object({
  name: z.string().min(1, "Required"),
  code: z.string().min(1, "Required"),
  department_id: z.string().min(1, "Required"),
  credits: z.number().min(0, "Must be zero or more"),
});

type FormValues = z.infer<typeof schema>;

function NewSubjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultDepartmentId = searchParams.get("department_id") ?? undefined;
  const createSubject = useCreateSubject();
  const { data: departments, isLoading: departmentsLoading } = useDepartments({
    page: 1,
    pageSize: 100,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { department_id: defaultDepartmentId },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const subject = await createSubject.mutateAsync({
        name: values.name,
        code: values.code,
        department_id: values.department_id,
        credits: values.credits,
      });
      toast.success(`${subject.name} added`);
      router.push(`/app/academics/departments/${subject.department_id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add subject");
    }
  });

  return (
    <FormPageTemplate
      title="Add subject"
      description="Create a new subject under a department."
      onSubmit={onSubmit}
      onCancel={() => router.back()}
      submitLabel="Add subject"
      submitting={createSubject.isPending}
    >
      <FormSection title="Details">
        <FormField label="Name" htmlFor="name" error={errors.name?.message}>
          <Input id="name" {...register("name")} />
        </FormField>
        <FormField label="Code" htmlFor="code" error={errors.code?.message}>
          <Input id="code" {...register("code")} />
        </FormField>
        <FormField label="Department" htmlFor="department_id" error={errors.department_id?.message}>
          <Select
            value={watch("department_id")}
            onValueChange={(v) => setValue("department_id", v)}
          >
            <SelectTrigger id="department_id" className="w-full">
              <SelectValue placeholder={departmentsLoading ? "Loading…" : "Select…"} />
            </SelectTrigger>
            <SelectContent>
              {departments?.data.map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Credits" htmlFor="credits" error={errors.credits?.message}>
          <Input id="credits" type="number" min={0} step={1} {...register("credits", { valueAsNumber: true })} />
        </FormField>
      </FormSection>
    </FormPageTemplate>
  );
}

export default function Page() {
  return (
    <RequirePermission permission="courses:catalog:write">
      <Suspense fallback={null}>
        <NewSubjectPage />
      </Suspense>
    </RequirePermission>
  );
}
