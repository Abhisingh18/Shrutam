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
import { useCreateInvoice } from "@/hooks/use-invoices";
import { useFeeStructures } from "@/hooks/use-fee-structures";
import { ApiError } from "@/lib/api-client";

const schema = z.object({
  student_id: z.uuid("Enter a valid student ID"),
  fee_structure_id: z.string().optional(),
  amount: z.string().min(1, "Required"),
  due_date: z.string().min(1, "Required"),
});

type FormValues = z.infer<typeof schema>;

function NewInvoicePage() {
  const router = useRouter();
  const createInvoice = useCreateInvoice();
  const { data: feeStructures } = useFeeStructures({ page: 1, pageSize: 100 });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const invoice = await createInvoice.mutateAsync({
        student_id: values.student_id,
        fee_structure_id: values.fee_structure_id || null,
        amount: values.amount,
        due_date: values.due_date,
      });
      toast.success(`Invoice ${invoice.invoice_number} created`);
      router.push(`/app/finance/${invoice.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create invoice");
    }
  });

  return (
    <FormPageTemplate
      title="Add invoice"
      description="Create a new fee invoice for a student."
      onSubmit={onSubmit}
      onCancel={() => router.back()}
      submitLabel="Add invoice"
      submitting={createInvoice.isPending}
    >
      <FormSection title="Invoice">
        <FormField
          label="Student ID"
          htmlFor="student_id"
          error={errors.student_id?.message}
          className="sm:col-span-2"
        >
          <Input id="student_id" placeholder="Paste the student's ID from their profile" {...register("student_id")} />
        </FormField>
        <FormField label="Fee structure" htmlFor="fee_structure_id">
          <Select
            value={watch("fee_structure_id")}
            onValueChange={(v) => setValue("fee_structure_id", v)}
          >
            <SelectTrigger id="fee_structure_id" className="w-full">
              <SelectValue placeholder="Optional…" />
            </SelectTrigger>
            <SelectContent>
              {feeStructures?.data.map((fs) => (
                <SelectItem key={fs.id} value={fs.id}>
                  {fs.name} — ₹{fs.amount}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Amount" htmlFor="amount" error={errors.amount?.message}>
          <Input id="amount" type="number" step="0.01" {...register("amount")} />
        </FormField>
        <FormField label="Due date" htmlFor="due_date" error={errors.due_date?.message}>
          <Input id="due_date" type="date" {...register("due_date")} />
        </FormField>
      </FormSection>
    </FormPageTemplate>
  );
}

export default function Page() {
  return (
    <RequirePermission permission="fees:invoice:write">
      <NewInvoicePage />
    </RequirePermission>
  );
}
