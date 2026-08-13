"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { RequirePermission } from "@/components/auth/require-permission";
import { FormPageTemplate, FormSection, FormField } from "@/components/templates/form-page-template";
import { Input } from "@/components/ui/input";
import { useCreateAdmission } from "@/hooks/use-admissions";
import { ApiError } from "@/lib/api-client";

const schema = z.object({
  applicant_name: z.string().min(1, "Required"),
  applicant_email: z.email("Enter a valid email").optional().or(z.literal("")),
  applicant_phone: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function NewAdmissionPage() {
  const router = useRouter();
  const createAdmission = useCreateAdmission();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const admission = await createAdmission.mutateAsync({
        applicant_name: values.applicant_name,
        applicant_email: values.applicant_email || null,
        applicant_phone: values.applicant_phone || null,
      });
      toast.success(`Application for ${admission.applicant_name} created`);
      router.push(`/app/admissions/${admission.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create application");
    }
  });

  return (
    <FormPageTemplate
      title="Add application"
      description="Record a new admission application."
      onSubmit={onSubmit}
      onCancel={() => router.back()}
      submitLabel="Add application"
      submitting={createAdmission.isPending}
    >
      <FormSection title="Applicant">
        <FormField
          label="Full name"
          htmlFor="applicant_name"
          error={errors.applicant_name?.message}
          className="sm:col-span-2"
        >
          <Input id="applicant_name" {...register("applicant_name")} />
        </FormField>
        <FormField label="Email" htmlFor="applicant_email" error={errors.applicant_email?.message}>
          <Input id="applicant_email" type="email" {...register("applicant_email")} />
        </FormField>
        <FormField label="Phone" htmlFor="applicant_phone">
          <Input id="applicant_phone" {...register("applicant_phone")} />
        </FormField>
      </FormSection>
    </FormPageTemplate>
  );
}

export default function Page() {
  return (
    <RequirePermission permission="admissions:application:write">
      <NewAdmissionPage />
    </RequirePermission>
  );
}
