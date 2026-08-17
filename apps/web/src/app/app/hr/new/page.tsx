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
import { useCreateEmployee } from "@/hooks/use-employees";
import { ApiError } from "@/lib/api-client";

const schema = z.object({
  full_name: z.string().min(1, "Required"),
  email: z.email("Enter a valid email"),
  phone: z.string().optional(),
  designation: z.string().min(1, "Required"),
  employment_type: z.enum(["full_time", "part_time", "contract", "intern"]),
  joining_date: z.string().min(1, "Required"),
});

type FormValues = z.infer<typeof schema>;

function NewEmployeePage() {
  const router = useRouter();
  const createEmployee = useCreateEmployee();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { employment_type: "full_time" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const employee = await createEmployee.mutateAsync({
        full_name: values.full_name,
        email: values.email,
        phone: values.phone || null,
        designation: values.designation,
        employment_type: values.employment_type,
        joining_date: values.joining_date,
      });
      toast.success(`${employee.full_name} added`);
      router.push(`/app/hr/${employee.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add employee");
    }
  });

  return (
    <FormPageTemplate
      title="Add employee"
      description="Create a new non-teaching staff record."
      onSubmit={onSubmit}
      onCancel={() => router.back()}
      submitLabel="Add employee"
      submitting={createEmployee.isPending}
    >
      <FormSection title="Identity">
        <FormField label="Full name" htmlFor="full_name" error={errors.full_name?.message}>
          <Input id="full_name" {...register("full_name")} />
        </FormField>
        <FormField label="Designation" htmlFor="designation" error={errors.designation?.message}>
          <Input id="designation" placeholder="Librarian" {...register("designation")} />
        </FormField>
        <FormField label="Employment type" htmlFor="employment_type">
          <Select
            value={watch("employment_type")}
            onValueChange={(v) => setValue("employment_type", v as FormValues["employment_type"])}
          >
            <SelectTrigger id="employment_type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full_time">Full time</SelectItem>
              <SelectItem value="part_time">Part time</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="intern">Intern</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Joining date" htmlFor="joining_date" error={errors.joining_date?.message}>
          <Input id="joining_date" type="date" {...register("joining_date")} />
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
    <RequirePermission permission="hr:employee:write">
      <NewEmployeePage />
    </RequirePermission>
  );
}
