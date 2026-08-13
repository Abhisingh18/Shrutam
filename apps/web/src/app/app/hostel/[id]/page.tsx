"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/auth/require-permission";
import { DetailPageTemplate } from "@/components/templates/detail-page-template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRoom } from "@/hooks/use-rooms";
import { useHostels } from "@/hooks/use-hostels";
import {
  useCreateRoomAllocation,
  useRoomAllocations,
  useVacateRoomAllocation,
} from "@/hooks/use-room-allocations";
import { ApiError } from "@/lib/api-client";
import type { RoomAllocation } from "@/types/hostel";

const allocationStatusVariant: Record<RoomAllocation["status"], string> = {
  active: "bg-success-bg text-success border-transparent",
  vacated: "bg-muted text-muted-foreground border-transparent",
};

function OverviewTab({ roomId }: { roomId: string }) {
  const { data: room, isLoading } = useRoom(roomId);
  const { data: hostelsData } = useHostels({ page: 1, pageSize: 100 });

  if (isLoading) return <Skeleton className="h-40 w-full max-w-md" />;
  if (!room) return null;

  const hostelName = hostelsData?.data.find((h) => h.id === room.hostel_id)?.name ?? room.hostel_id;

  const rows: [string, string][] = [
    ["Room number", room.room_number],
    ["Hostel", hostelName],
    ["Capacity", String(room.capacity)],
    ["Occupied", String(room.occupied_count)],
  ];

  return (
    <dl className="max-w-md divide-y divide-border rounded-lg border border-border">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between px-4 py-3 text-sm">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-medium text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function AllocateToStudentForm({ roomId }: { roomId: string }) {
  const [studentId, setStudentId] = useState("");
  const [allocatedDate, setAllocatedDate] = useState("");
  const createAllocation = useCreateRoomAllocation();

  const onAllocate = async () => {
    if (!studentId || !allocatedDate) {
      toast.error("Student ID and allocated date are required");
      return;
    }
    try {
      await createAllocation.mutateAsync({
        room_id: roomId,
        student_id: studentId,
        allocated_date: allocatedDate,
      });
      toast.success("Student allocated to room");
      setStudentId("");
      setAllocatedDate("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to allocate room");
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4 mb-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="alloc-student-id">
          Student ID
        </label>
        <Input
          id="alloc-student-id"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          placeholder="Student UUID"
          className="w-64"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="alloc-date">
          Allocated date
        </label>
        <Input
          id="alloc-date"
          type="date"
          value={allocatedDate}
          onChange={(e) => setAllocatedDate(e.target.value)}
          className="w-44"
        />
      </div>
      <Button onClick={onAllocate} disabled={createAllocation.isPending}>
        {createAllocation.isPending ? "Allocating…" : "Allocate to student"}
      </Button>
    </div>
  );
}

function AllocationsTab({ roomId }: { roomId: string }) {
  const { data, isLoading } = useRoomAllocations({ page: 1, pageSize: 50, roomId });
  const vacateAllocation = useVacateRoomAllocation();

  const onVacate = async (allocationId: string) => {
    try {
      await vacateAllocation.mutateAsync(allocationId);
      toast.success("Room vacated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to vacate room");
    }
  };

  return (
    <div>
      <AllocateToStudentForm roomId={roomId} />

      {isLoading && <Skeleton className="h-32 w-full" />}

      {!isLoading && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Allocated</TableHead>
              <TableHead>Vacated</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  No allocations for this room yet.
                </TableCell>
              </TableRow>
            )}
            {data?.data.map((allocation) => (
              <TableRow key={allocation.id}>
                <TableCell className="font-mono text-xs">{allocation.student_id}</TableCell>
                <TableCell>{allocation.allocated_date}</TableCell>
                <TableCell>{allocation.vacated_date ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={allocationStatusVariant[allocation.status]}>
                    {allocation.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {allocation.status === "active" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onVacate(allocation.id)}
                      disabled={vacateAllocation.isPending}
                    >
                      Vacate
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function RoomDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const { data: room } = useRoom(id);

  return (
    <DetailPageTemplate
      title={room ? `Room ${room.room_number}` : "…"}
      subtitle={room ? `${room.occupied_count}/${room.capacity} occupied` : undefined}
      statusBadge={
        room
          ? {
              label: room.occupied_count < room.capacity ? "Available" : "Full",
              variant: room.occupied_count < room.capacity ? "success" : "error",
            }
          : undefined
      }
      actions={
        <Button variant="outline" asChild>
          <Link href={`/app/hostel/${id}/edit`}>
            <Pencil className="size-4" /> Edit
          </Link>
        </Button>
      }
      tabs={[
        { value: "overview", label: "Overview", content: <OverviewTab roomId={id} /> },
        { value: "allocations", label: "Allocations", content: <AllocationsTab roomId={id} /> },
      ]}
      rightRail={
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Quick actions</h3>
          <Button variant="outline" size="sm" className="w-full" onClick={() => router.push("/app/hostel")}>
            Back to hostel
          </Button>
        </div>
      }
    />
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission permission="hostel:room:read">
      <RoomDetailPage id={id} />
    </RequirePermission>
  );
}
