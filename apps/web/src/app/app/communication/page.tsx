"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/auth/require-permission";
import { ListPageTemplate } from "@/components/templates/list-page-template";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  useAnnouncements,
  useDeleteAnnouncement,
  usePublishAnnouncement,
} from "@/hooks/use-announcements";
import { ApiError } from "@/lib/api-client";
import type { Announcement } from "@/types/communication";

const audienceLabel: Record<Announcement["audience"], string> = {
  all: "All",
  students: "Students",
  faculty: "Faculty",
  parents: "Parents",
  staff: "Staff",
};

function AnnouncementActions({ announcement }: { announcement: Announcement }) {
  const publishAnnouncement = usePublishAnnouncement(announcement.id);
  const deleteAnnouncement = useDeleteAnnouncement();

  const handlePublish = async () => {
    try {
      await publishAnnouncement.mutateAsync();
      toast.success("Announcement published");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to publish announcement");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteAnnouncement.mutateAsync(announcement.id);
      toast.success("Announcement deleted");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete announcement");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!announcement.published_at && (
          <DropdownMenuItem onClick={handlePublish}>Publish</DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleDelete} className="text-destructive">
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CommunicationListPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, isFetching } = useAnnouncements({ page, pageSize });

  return (
    <ListPageTemplate
      title="Communication"
      description="Institution-wide and audience-targeted announcements."
      primaryAction={{
        label: "New announcement",
        onClick: () => router.push("/app/communication/new"),
      }}
      page={page}
      pageSize={pageSize}
      total={data?.meta.total ?? 0}
      onPageChange={setPage}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Audience</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 5 }).map((__, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {!isLoading && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                No announcements yet — create your first one.
              </TableCell>
            </TableRow>
          )}

          {!isLoading &&
            data?.data.map((announcement) => (
              <TableRow
                key={announcement.id}
                className={`cursor-pointer ${isFetching ? "opacity-60" : ""}`}
                onClick={() => router.push(`/app/communication/${announcement.id}`)}
              >
                <TableCell className="font-medium text-foreground">
                  {announcement.title}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {audienceLabel[announcement.audience]}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      announcement.published_at
                        ? "bg-success-bg text-success border-transparent"
                        : "bg-warning-bg text-warning border-transparent"
                    }
                  >
                    {announcement.published_at ? "Published" : "Draft"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(announcement.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <AnnouncementActions announcement={announcement} />
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </ListPageTemplate>
  );
}

export default function Page() {
  return (
    <RequirePermission permission="communication:message:read">
      <CommunicationListPage />
    </RequirePermission>
  );
}
