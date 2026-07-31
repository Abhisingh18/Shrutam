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
import { useCreateStudent } from "@/hooks/use-students";
import { ApiError } from "@/lib/api-client";

const schema = z.object({
  admission_number: z.string().min(1, "Required"),
  full_name: z.string().min(1, "Required"),
  email: z.email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
});

type FormValues = z.infer<typeof schema>;

function NewStudentPage() {
  const router = useRouter();
  const createStudent = useCreateStudent();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const student = await createStudent.mutateAsync({
        admission_number: values.admission_number,
        full_name: values.full_name,
        email: values.email || null,
        phone: values.phone || null,
        gender: values.gender,
      });
      toast.success(`${student.full_name} added`);
      router.push(`/app/students/${student.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add student");
    }
  });

  return (
    <FormPageTemplate
      title="Add student"
      description="Create a new student record."
      onSubmit={onSubmit}
      onCancel={() => router.back()}
      submitLabel="Add student"
      submitting={createStudent.isPending}
    >
      <FormSection title="Identity">
        <FormField label="Admission number" htmlFor="admission_number" error={errors.admission_number?.message}>
          <Input id="admission_number" {...register("admission_number")} />
        </FormField>
        <FormField label="Full name" htmlFor="full_name" error={errors.full_name?.message}>
          <Input id="full_name" {...register("full_name")} />
        </FormField>
        <FormField label="Gender" htmlFor="gender">
          <Select value={watch("gender")} onValueChange={(v) => setValue("gender", v as FormValues["gender"])}>
            <SelectTrigger id="gender" className="w-full">
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
              <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
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

export default function Page() {
  return (
    <RequirePermission permission="students:profile:write">
      <NewStudentPage />
    </RequirePermission>
  );
}
