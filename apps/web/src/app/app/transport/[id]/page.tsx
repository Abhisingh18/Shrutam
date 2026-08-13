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
import { useRoute } from "@/hooks/use-routes";
import { useVehicles } from "@/hooks/use-vehicles";
import {
  useCancelTransportPass,
  useCreateTransportPass,
  useTransportPasses,
} from "@/hooks/use-transport-passes";
import { ApiError } from "@/lib/api-client";
import type { TransportPass } from "@/types/transport";

const passStatusVariant: Record<TransportPass["status"], string> = {
  active: "bg-success-bg text-success border-transparent",
  expired: "bg-muted text-muted-foreground border-transparent",
  cancelled: "bg-destructive-bg text-destructive border-transparent",
};

function OverviewTab({ routeId }: { routeId: string }) {
  const { data: route, isLoading } = useRoute(routeId);
  const { data: vehiclesData } = useVehicles({ page: 1, pageSize: 100 });

  if (isLoading) return <Skeleton className="h-40 w-full max-w-md" />;
  if (!route) return null;

  const vehicleLabel = route.vehicle_id
    ? vehiclesData?.data.find((v) => v.id === route.vehicle_id)?.registration_number ??
      route.vehicle_id
    : "—";

  const rows: [string, string][] = [
    ["Route name", route.name],
    ["Vehicle", vehicleLabel],
    ["Stops", route.stops ?? "—"],
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

function IssuePassForm({ routeId }: { routeId: string }) {
  const [studentId, setStudentId] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const createPass = useCreateTransportPass();

  const onIssue = async () => {
    if (!studentId || !validFrom) {
      toast.error("Student ID and valid-from date are required");
      return;
    }
    try {
      await createPass.mutateAsync({
        student_id: studentId,
        route_id: routeId,
        valid_from: validFrom,
        valid_until: validUntil || null,
      });
      toast.success("Pass issued");
      setStudentId("");
      setValidFrom("");
      setValidUntil("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to issue pass");
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4 mb-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="pass-student-id">
          Student ID
        </label>
        <Input
          id="pass-student-id"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          placeholder="Student UUID"
          className="w-64"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="pass-valid-from">
          Valid from
        </label>
        <Input
          id="pass-valid-from"
          type="date"
          value={validFrom}
          onChange={(e) => setValidFrom(e.target.value)}
          className="w-44"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="pass-valid-until">
          Valid until
        </label>
        <Input
          id="pass-valid-until"
          type="date"
          value={validUntil}
          onChange={(e) => setValidUntil(e.target.value)}
          className="w-44"
        />
      </div>
      <Button onClick={onIssue} disabled={createPass.isPending}>
        {createPass.isPending ? "Issuing…" : "Issue pass"}
      </Button>
    </div>
  );
}

function PassesTab({ routeId }: { routeId: string }) {
  const { data, isLoading } = useTransportPasses({ page: 1, pageSize: 50, routeId });
  const cancelPass = useCancelTransportPass();

  const onCancel = async (passId: string) => {
    try {
      await cancelPass.mutateAsync(passId);
      toast.success("Pass cancelled");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to cancel pass");
    }
  };

  return (
    <div>
      <IssuePassForm routeId={routeId} />

      {isLoading && <Skeleton className="h-32 w-full" />}

      {!isLoading && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Valid from</TableHead>
              <TableHead>Valid until</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  No passes issued for this route yet.
                </TableCell>
              </TableRow>
            )}
            {data?.data.map((pass) => (
              <TableRow key={pass.id}>
                <TableCell className="font-mono text-xs">{pass.student_id}</TableCell>
                <TableCell>{pass.valid_from}</TableCell>
                <TableCell>{pass.valid_until ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={passStatusVariant[pass.status]}>
                    {pass.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {pass.status === "active" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onCancel(pass.id)}
                      disabled={cancelPass.isPending}
                    >
                      Cancel
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

function RouteDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const { data: route } = useRoute(id);

  return (
    <DetailPageTemplate
      title={route ? route.name : "…"}
      subtitle={route?.stops ?? undefined}
      actions={
        <Button variant="outline" asChild>
          <Link href={`/app/transport/${id}/edit`}>
            <Pencil className="size-4" /> Edit
          </Link>
        </Button>
      }
      tabs={[
        { value: "overview", label: "Overview", content: <OverviewTab routeId={id} /> },
        { value: "passes", label: "Passes", content: <PassesTab routeId={id} /> },
      ]}
      rightRail={
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Quick actions</h3>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => router.push("/app/transport")}
          >
            Back to transport
          </Button>
        </div>
      }
    />
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission permission="transport:route:read">
      <RouteDetailPage id={id} />
    </RequirePermission>
  );
}
