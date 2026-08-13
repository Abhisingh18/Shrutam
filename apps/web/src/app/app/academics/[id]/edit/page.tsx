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
import { useDepartment, useUpdateDepartment } from "@/hooks/use-departments";
import { ApiError } from "@/lib/api-client";

const schema = z.object({
  name: z.string().min(1, "Required"),
  code: z.string().min(1, "Required"),
});

type FormValues = z.infer<typeof schema>;

function EditDepartmentPage({ id }: { id: string }) {
  const router = useRouter();
  const { data: department, isLoading } = useDepartment(id);
  const updateDepartment = useUpdateDepartment(id);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (department) {
      reset({ name: department.name, code: department.code });
    }
  }, [department, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateDepartment.mutateAsync({ name: values.name, code: values.code });
      toast.success("Department updated");
      router.push(`/app/academics/${id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update department");
    }
  });

  if (isLoading || !department) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full max-w-2xl" />
      </div>
    );
  }

  return (
    <FormPageTemplate
      title={`Edit ${department.name}`}
      description={`Department code ${department.code}`}
      onSubmit={onSubmit}
      onCancel={() => router.back()}
      submitLabel="Save changes"
      submitting={updateDepartment.isPending}
    >
      <FormSection title="Details">
        <FormField label="Name" htmlFor="name" error={errors.name?.message}>
          <Input id="name" {...register("name")} />
        </FormField>
        <FormField label="Code" htmlFor="code" error={errors.code?.message}>
          <Input id="code" {...register("code")} />
        </FormField>
      </FormSection>
    </FormPageTemplate>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission permission="courses:catalog:write">
      <EditDepartmentPage id={id} />
    </RequirePermission>
  );
}
