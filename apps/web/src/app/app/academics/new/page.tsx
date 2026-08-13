"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { RequirePermission } from "@/components/auth/require-permission";
import { FormPageTemplate, FormSection, FormField } from "@/components/templates/form-page-template";
import { Input } from "@/components/ui/input";
import { useCreateDepartment } from "@/hooks/use-departments";
import { ApiError } from "@/lib/api-client";

const schema = z.object({
  name: z.string().min(1, "Required"),
  code: z.string().min(1, "Required"),
});

type FormValues = z.infer<typeof schema>;

function NewDepartmentPage() {
  const router = useRouter();
  const createDepartment = useCreateDepartment();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const department = await createDepartment.mutateAsync({
        name: values.name,
        code: values.code,
      });
      toast.success(`${department.name} added`);
      router.push(`/app/academics/${department.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add department");
    }
  });

  return (
    <FormPageTemplate
      title="Add department"
      description="Create a new academic department."
      onSubmit={onSubmit}
      onCancel={() => router.back()}
      submitLabel="Add department"
      submitting={createDepartment.isPending}
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

export default function Page() {
  return (
    <RequirePermission permission="courses:catalog:write">
      <NewDepartmentPage />
    </RequirePermission>
  );
}
