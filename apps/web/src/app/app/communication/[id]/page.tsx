"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RequirePermission } from "@/components/auth/require-permission";
import { DetailPageTemplate } from "@/components/templates/detail-page-template";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnnouncement, usePublishAnnouncement } from "@/hooks/use-announcements";
import { ApiError } from "@/lib/api-client";

const audienceLabel: Record<string, string> = {
  all: "All",
  students: "Students",
  faculty: "Faculty",
  parents: "Parents",
  staff: "Staff",
};

function OverviewTab({ announcementId }: { announcementId: string }) {
  const { data: announcement, isLoading } = useAnnouncement(announcementId);

  if (isLoading) return <Skeleton className="h-40 w-full max-w-md" />;
  if (!announcement) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <dl className="divide-y divide-border rounded-lg border border-border">
        {(
          [
            ["Title", announcement.title],
            ["Audience", audienceLabel[announcement.audience] ?? announcement.audience],
            ["Status", announcement.published_at ? "Published" : "Draft"],
            ["Created", new Date(announcement.created_at).toLocaleString()],
          ] as [string, string][]
        ).map(([label, value]) => (
          <div key={label} className="flex justify-between px-4 py-3 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">Body</h3>
        <p className="text-sm text-foreground whitespace-pre-wrap rounded-lg border border-border px-4 py-3">
          {announcement.body}
        </p>
      </div>
    </div>
  );
}

function AnnouncementDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const { data: announcement } = useAnnouncement(id);
  const publishAnnouncement = usePublishAnnouncement(id);

  const handlePublish = async () => {
    try {
      await publishAnnouncement.mutateAsync();
      toast.success("Announcement published");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to publish announcement");
    }
  };

  return (
    <DetailPageTemplate
      title={announcement?.title ?? "…"}
      subtitle={
        announcement
          ? `Audience: ${audienceLabel[announcement.audience] ?? announcement.audience}`
          : undefined
      }
      statusBadge={
        announcement
          ? {
              label: announcement.published_at ? "Published" : "Draft",
              variant: announcement.published_at ? "success" : "warning",
            }
          : undefined
      }
      actions={
        announcement && !announcement.published_at ? (
          <Button onClick={handlePublish} disabled={publishAnnouncement.isPending}>
            {publishAnnouncement.isPending ? "Publishing…" : "Publish"}
          </Button>
        ) : undefined
      }
      tabs={[
        { value: "overview", label: "Overview", content: <OverviewTab announcementId={id} /> },
      ]}
      rightRail={
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Quick actions</h3>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => router.push("/app/communication")}
          >
            Back to all announcements
          </Button>
        </div>
      }
    />
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission permission="communication:message:read">
      <AnnouncementDetailPage id={id} />
    </RequirePermission>
  );
}
