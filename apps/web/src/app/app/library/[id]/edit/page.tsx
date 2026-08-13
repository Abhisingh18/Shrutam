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
import { useBook, useUpdateBook } from "@/hooks/use-books";
import { ApiError } from "@/lib/api-client";

const schema = z.object({
  title: z.string().min(1, "Required"),
  author: z.string().min(1, "Required"),
  isbn: z.string().optional(),
  total_copies: z.number().int().min(0, "Must be 0 or more"),
  category: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function EditBookPage({ id }: { id: string }) {
  const router = useRouter();
  const { data: book, isLoading } = useBook(id);
  const updateBook = useUpdateBook(id);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (book) {
      reset({
        title: book.title,
        author: book.author,
        isbn: book.isbn ?? "",
        total_copies: book.total_copies,
        category: book.category ?? "",
      });
    }
  }, [book, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateBook.mutateAsync({
        title: values.title,
        author: values.author,
        isbn: values.isbn || null,
        total_copies: values.total_copies,
        category: values.category || null,
      });
      toast.success("Book updated");
      router.push(`/app/library/${id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update book");
    }
  });

  if (isLoading || !book) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full max-w-2xl" />
      </div>
    );
  }

  return (
    <FormPageTemplate
      title={`Edit ${book.title}`}
      description={`by ${book.author}`}
      onSubmit={onSubmit}
      onCancel={() => router.back()}
      submitLabel="Save changes"
      submitting={updateBook.isPending}
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

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission permission="library:book:write">
      <EditBookPage id={id} />
    </RequirePermission>
  );
}
