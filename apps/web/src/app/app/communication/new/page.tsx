"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { RequirePermission } from "@/components/auth/require-permission";
import { FormPageTemplate, FormSection, FormField } from "@/components/templates/form-page-template";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateAnnouncement } from "@/hooks/use-announcements";
import { ApiError } from "@/lib/api-client";

const schema = z.object({
  title: z.string().min(1, "Required").max(255),
  audience: z.enum(["all", "students", "faculty", "parents", "staff"]),
  body: z.string().min(1, "Required").max(4000),
});

type FormValues = z.infer<typeof schema>;

function NewAnnouncementPage() {
  const router = useRouter();
  const createAnnouncement = useCreateAnnouncement();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { audience: "all" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const announcement = await createAnnouncement.mutateAsync({
        title: values.title,
        audience: values.audience,
        body: values.body,
      });
      toast.success("Announcement saved as draft");
      router.push(`/app/communication/${announcement.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create announcement");
    }
  });

  return (
    <FormPageTemplate
      title="New announcement"
      description="Compose an announcement. It's saved as a draft until you publish it."
      onSubmit={onSubmit}
      onCancel={() => router.back()}
      submitLabel="Save draft"
      submitting={createAnnouncement.isPending}
    >
      <FormSection title="Details">
        <FormField label="Title" htmlFor="title" error={errors.title?.message} className="sm:col-span-2">
          <Input id="title" {...register("title")} />
        </FormField>
        <FormField label="Audience" htmlFor="audience">
          <Select
            value={watch("audience")}
            onValueChange={(v) => setValue("audience", v as FormValues["audience"])}
          >
            <SelectTrigger id="audience" className="w-full">
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="students">Students</SelectItem>
              <SelectItem value="faculty">Faculty</SelectItem>
              <SelectItem value="parents">Parents</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </FormSection>

      <FormSection title="Message">
        <FormField label="Body" htmlFor="body" error={errors.body?.message} className="sm:col-span-2">
          <Textarea id="body" rows={8} {...register("body")} />
        </FormField>
      </FormSection>
    </FormPageTemplate>
  );
}

export default function Page() {
  return (
    <RequirePermission permission="communication:message:write">
      <NewAnnouncementPage />
    </RequirePermission>
  );
}
