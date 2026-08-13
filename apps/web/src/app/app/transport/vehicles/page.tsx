"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

import { useVehicles } from "@/hooks/use-vehicles";

function VehiclesListPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, isFetching } = useVehicles({ page, pageSize });

  return (
    <ListPageTemplate
      title="Vehicles"
      description="The fleet used to run transport routes."
      primaryAction={{
        label: "Add vehicle",
        onClick: () => router.push("/app/transport/vehicles/new"),
      }}
      page={page}
      pageSize={pageSize}
      total={data?.meta.total ?? 0}
      onPageChange={setPage}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Registration #</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Capacity</TableHead>
            <TableHead>Driver</TableHead>
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
                No vehicles yet — add your first one.
              </TableCell>
            </TableRow>
          )}

          {!isLoading &&
            data?.data.map((vehicle) => (
              <TableRow key={vehicle.id} className={isFetching ? "opacity-60" : ""}>
                <TableCell className="font-medium text-foreground">
                  {vehicle.registration_number}
                </TableCell>
                <TableCell className="text-muted-foreground">{vehicle.vehicle_type}</TableCell>
                <TableCell>{vehicle.capacity}</TableCell>
                <TableCell className="text-muted-foreground">
                  {vehicle.driver_name ?? "—"}
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
    <RequirePermission permission="transport:vehicle:read">
      <VehiclesListPage />
    </RequirePermission>
  );
}
