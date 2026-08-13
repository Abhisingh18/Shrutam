"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/auth/require-permission";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreateFeeStructure, useFeeStructures } from "@/hooks/use-fee-structures";
import { ApiError } from "@/lib/api-client";
import type { FeeStructure } from "@/types/finance";

function CreateFeeStructureDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<FeeStructure["frequency"]>("annual");
  const createFeeStructure = useCreateFeeStructure();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createFeeStructure.mutateAsync({ name, amount, frequency });
      toast.success("Fee structure added");
      setOpen(false);
      setName("");
      setAmount("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add fee structure");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add fee structure</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add fee structure</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="fs-name">Name</Label>
              <Input
                id="fs-name"
                className="mt-1.5"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Annual Tuition 2026-27"
                required
              />
            </div>
            <div>
              <Label htmlFor="fs-amount">Amount</Label>
              <Input
                id="fs-amount"
                type="number"
                step="0.01"
                className="mt-1.5"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="fs-frequency">Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as FeeStructure["frequency"])}>
                <SelectTrigger id="fs-frequency" className="w-full mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One-time</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createFeeStructure.isPending}>
              {createFeeStructure.isPending ? "Adding…" : "Add fee structure"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FeeStructuresPage() {
  const { data, isLoading } = useFeeStructures({ page: 1, pageSize: 100 });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Fee structures</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Reusable fee definitions you can attach to invoices.
          </p>
        </div>
        <CreateFeeStructureDialog />
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Frequency</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={3}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                  No fee structures yet — add your first one.
                </TableCell>
              </TableRow>
            )}
            {data?.data.map((fs) => (
              <TableRow key={fs.id}>
                <TableCell className="font-medium text-foreground">{fs.name}</TableCell>
                <TableCell className="tabular-nums">₹{fs.amount}</TableCell>
                <TableCell className="capitalize text-muted-foreground">
                  {fs.frequency.replace("_", " ")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <RequirePermission permission="fees:structure:read">
      <FeeStructuresPage />
    </RequirePermission>
  );
}
