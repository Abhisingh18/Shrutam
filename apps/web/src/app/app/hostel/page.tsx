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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRooms } from "@/hooks/use-rooms";
import { useCreateHostel, useHostels } from "@/hooks/use-hostels";
import { ApiError } from "@/lib/api-client";

function CreateHostelDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [wardenName, setWardenName] = useState("");
  const createHostel = useCreateHostel();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createHostel.mutateAsync({ name, warden_name: wardenName || null });
      toast.success("Hostel added");
      setOpen(false);
      setName("");
      setWardenName("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add hostel");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Add hostel</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add hostel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="hostel-name">Name</Label>
              <Input
                id="hostel-name"
                className="mt-1.5"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Boys Hostel A"
                required
              />
            </div>
            <div>
              <Label htmlFor="hostel-warden">Warden name</Label>
              <Input
                id="hostel-warden"
                className="mt-1.5"
                value={wardenName}
                onChange={(e) => setWardenName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createHostel.isPending}>
              {createHostel.isPending ? "Adding…" : "Add hostel"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RoomsListPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, isFetching } = useRooms({ page, pageSize });
  const { data: hostelsData } = useHostels({ page: 1, pageSize: 100 });
  const hostelNameById = new Map((hostelsData?.data ?? []).map((h) => [h.id, h.name]));

  return (
    <ListPageTemplate
      title="Hostel"
      description="Rooms across every hostel block, and who's allocated where."
      primaryAction={{ label: "Add room", onClick: () => router.push("/app/hostel/new") }}
      toolbarExtra={<CreateHostelDialog />}
      page={page}
      pageSize={pageSize}
      total={data?.meta.total ?? 0}
      onPageChange={setPage}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Room #</TableHead>
            <TableHead>Hostel</TableHead>
            <TableHead>Capacity</TableHead>
            <TableHead>Occupied</TableHead>
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
                No rooms yet — add your first one.
              </TableCell>
            </TableRow>
          )}

          {!isLoading &&
            data?.data.map((room) => (
              <TableRow
                key={room.id}
                className={`cursor-pointer ${isFetching ? "opacity-60" : ""}`}
                onClick={() => router.push(`/app/hostel/${room.id}`)}
              >
                <TableCell className="font-medium text-foreground">{room.room_number}</TableCell>
                <TableCell className="text-muted-foreground">
                  {hostelNameById.get(room.hostel_id) ?? room.hostel_id}
                </TableCell>
                <TableCell>{room.capacity}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      room.occupied_count < room.capacity
                        ? "bg-success-bg text-success border-transparent"
                        : "bg-destructive-bg text-destructive border-transparent"
                    }
                  >
                    {room.occupied_count} / {room.capacity}
                  </Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/app/hostel/${room.id}`)}>
                        View room
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/app/hostel/${room.id}/edit`)}>
                        Edit
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
    <RequirePermission permission="hostel:room:read">
      <RoomsListPage />
    </RequirePermission>
  );
}
