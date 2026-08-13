"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { RequirePermission } from "@/components/auth/require-permission";
import { FormPageTemplate, FormSection, FormField } from "@/components/templates/form-page-template";
import { Input } from "@/components/ui/input";
import { useCreateExam } from "@/hooks/use-exams";
import { ApiError } from "@/lib/api-client";

const schema = z.object({
  name: z.string().min(1, "Required"),
  exam_type: z.string().min(1, "Required"),
  subject_id: z.string().optional(),
  start_date: z.string().min(1, "Required"),
  end_date: z.string().min(1, "Required"),
  max_marks: z.number().min(1, "Must be at least 1"),
});

type FormValues = z.infer<typeof schema>;

function NewExaminationPage() {
  const router = useRouter();
  const createExam = useCreateExam();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { max_marks: 100 } });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const exam = await createExam.mutateAsync({
        name: values.name,
        exam_type: values.exam_type,
        // Plain text subject reference for now — a cross-module subject picker
        // (Academics module's `subjects` table) is a future wave.
        subject_id: values.subject_id || null,
        start_date: values.start_date,
        end_date: values.end_date,
        max_marks: values.max_marks,
      });
      toast.success(`${exam.name} added`);
      router.push(`/app/examinations/${exam.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add exam");
    }
  });

  return (
    <FormPageTemplate
      title="Add exam"
      description="Create a new exam."
      onSubmit={onSubmit}
      onCancel={() => router.back()}
      submitLabel="Add exam"
      submitting={createExam.isPending}
    >
      <FormSection title="Details">
        <FormField label="Name" htmlFor="name" error={errors.name?.message}>
          <Input id="name" {...register("name")} />
        </FormField>
        <FormField label="Exam type" htmlFor="exam_type" error={errors.exam_type?.message}>
          <Input id="exam_type" placeholder="Midterm, Final, Unit Test…" {...register("exam_type")} />
        </FormField>
        <FormField label="Subject ID" htmlFor="subject_id" className="sm:col-span-2">
          <Input id="subject_id" placeholder="Optional subject reference" {...register("subject_id")} />
        </FormField>
      </FormSection>

      <FormSection title="Schedule">
        <FormField label="Start date" htmlFor="start_date" error={errors.start_date?.message}>
          <Input id="start_date" type="date" {...register("start_date")} />
        </FormField>
        <FormField label="End date" htmlFor="end_date" error={errors.end_date?.message}>
          <Input id="end_date" type="date" {...register("end_date")} />
        </FormField>
        <FormField label="Max marks" htmlFor="max_marks" error={errors.max_marks?.message}>
          <Input id="max_marks" type="number" {...register("max_marks", { valueAsNumber: true })} />
        </FormField>
      </FormSection>
    </FormPageTemplate>
  );
}

export default function Page() {
  return (
    <RequirePermission permission="exams:schedule:write">
      <NewExaminationPage />
    </RequirePermission>
  );
}
