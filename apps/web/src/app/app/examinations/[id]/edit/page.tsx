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
import { useExam, useUpdateExam } from "@/hooks/use-exams";
import { ApiError } from "@/lib/api-client";

const schema = z.object({
  name: z.string().min(1, "Required"),
  exam_type: z.string().min(1, "Required"),
  start_date: z.string().min(1, "Required"),
  end_date: z.string().min(1, "Required"),
  max_marks: z.number().min(1, "Must be at least 1"),
  status: z.enum(["draft", "scheduled", "ongoing", "completed", "results_published"]),
});

type FormValues = z.infer<typeof schema>;

function EditExaminationPage({ id }: { id: string }) {
  const router = useRouter();
  const { data: exam, isLoading } = useExam(id);
  const updateExam = useUpdateExam(id);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (exam) {
      reset({
        name: exam.name,
        exam_type: exam.exam_type,
        start_date: exam.start_date,
        end_date: exam.end_date,
        max_marks: exam.max_marks,
        status: exam.status,
      });
    }
  }, [exam, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateExam.mutateAsync({
        name: values.name,
        exam_type: values.exam_type,
        start_date: values.start_date,
        end_date: values.end_date,
        max_marks: values.max_marks,
        status: values.status,
      });
      toast.success("Exam updated");
      router.push(`/app/examinations/${id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update exam");
    }
  });

  if (isLoading || !exam) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full max-w-2xl" />
      </div>
    );
  }

  return (
    <FormPageTemplate
      title={`Edit ${exam.name}`}
      description={`${exam.exam_type}`}
      onSubmit={onSubmit}
      onCancel={() => router.back()}
      submitLabel="Save changes"
      submitting={updateExam.isPending}
    >
      <FormSection title="Details">
        <FormField label="Name" htmlFor="name" error={errors.name?.message}>
          <Input id="name" {...register("name")} />
        </FormField>
        <FormField label="Exam type" htmlFor="exam_type" error={errors.exam_type?.message}>
          <Input id="exam_type" {...register("exam_type")} />
        </FormField>
        <FormField label="Status" htmlFor="status">
          <Select value={watch("status")} onValueChange={(v) => setValue("status", v as FormValues["status"])}>
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="ongoing">Ongoing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="results_published">Results published</SelectItem>
            </SelectContent>
          </Select>
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

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission permission="exams:schedule:write">
      <EditExaminationPage id={id} />
    </RequirePermission>
  );
}
