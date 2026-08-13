"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useRoutes } from "@/hooks/use-routes";
import { useVehicles } from "@/hooks/use-vehicles";

function RoutesListPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, isFetching } = useRoutes({ page, pageSize });
  const { data: vehiclesData } = useVehicles({ page: 1, pageSize: 100 });
  const vehicleRegistrationById = new Map(
    (vehiclesData?.data ?? []).map((v) => [v.id, v.registration_number])
  );

  return (
    <ListPageTemplate
      title="Transport"
      description="Routes, the vehicles assigned to them, and their stops."
      primaryAction={{ label: "Add route", onClick: () => router.push("/app/transport/new") }}
      toolbarExtra={
        <Button variant="outline" onClick={() => router.push("/app/transport/vehicles")}>
          Vehicles
        </Button>
      }
      page={page}
      pageSize={pageSize}
      total={data?.meta.total ?? 0}
      onPageChange={setPage}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Route</TableHead>
            <TableHead>Vehicle</TableHead>
            <TableHead>Stops</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 4 }).map((__, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {!isLoading && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                No routes yet — add your first one.
              </TableCell>
            </TableRow>
          )}

          {!isLoading &&
            data?.data.map((route) => (
              <TableRow
                key={route.id}
                className={`cursor-pointer ${isFetching ? "opacity-60" : ""}`}
                onClick={() => router.push(`/app/transport/${route.id}`)}
              >
                <TableCell className="font-medium text-foreground">{route.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {route.vehicle_id
                    ? vehicleRegistrationById.get(route.vehicle_id) ?? route.vehicle_id
                    : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{route.stops ?? "—"}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/app/transport/${route.id}`)}>
                        View route
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push(`/app/transport/${route.id}/edit`)}
                      >
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
    <RequirePermission permission="transport:route:read">
      <RoutesListPage />
    </RequirePermission>
  );
}
