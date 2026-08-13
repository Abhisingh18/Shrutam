"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { RequirePermission } from "@/components/auth/require-permission";
import { FormPageTemplate, FormSection, FormField } from "@/components/templates/form-page-template";
import { Input } from "@/components/ui/input";
import { useCreateBook } from "@/hooks/use-books";
import { ApiError } from "@/lib/api-client";

const schema = z.object({
  title: z.string().min(1, "Required"),
  author: z.string().min(1, "Required"),
  isbn: z.string().optional(),
  total_copies: z.number().int().min(0, "Must be 0 or more"),
  category: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function NewBookPage() {
  const router = useRouter();
  const createBook = useCreateBook();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { total_copies: 1 } });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const book = await createBook.mutateAsync({
        title: values.title,
        author: values.author,
        isbn: values.isbn || null,
        total_copies: values.total_copies,
        category: values.category || null,
      });
      toast.success(`${book.title} added`);
      router.push(`/app/library/${book.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add book");
    }
  });

  return (
    <FormPageTemplate
      title="Add book"
      description="Create a new catalogue entry."
      onSubmit={onSubmit}
      onCancel={() => router.back()}
      submitLabel="Add book"
      submitting={createBook.isPending}
    >
      <FormSection title="Details">
        <FormField label="Title" htmlFor="title" error={errors.title?.message}>
          <Input id="title" {...register("title")} />
        </FormField>
        <FormField label="Author" htmlFor="author" error={errors.author?.message}>
          <Input id="author" {...register("author")} />
        </FormField>
        <FormField label="ISBN" htmlFor="isbn">
          <Input id="isbn" {...register("isbn")} />
        </FormField>
        <FormField label="Category" htmlFor="category">
          <Input id="category" {...register("category")} />
        </FormField>
        <FormField label="Total copies" htmlFor="total_copies" error={errors.total_copies?.message}>
          <Input id="total_copies" type="number" min={0} {...register("total_copies", { valueAsNumber: true })} />
        </FormField>
      </FormSection>
    </FormPageTemplate>
  );
}

export default function Page() {
  return (
    <RequirePermission permission="library:book:write">
      <NewBookPage />
    </RequirePermission>
  );
}
