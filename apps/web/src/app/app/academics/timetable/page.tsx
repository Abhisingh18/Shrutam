"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { AcademicsSubNav } from "@/components/academics/academics-subnav";
import { usePermissions } from "@/hooks/use-me";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSections } from "@/hooks/use-sections";
import { useSubjects } from "@/hooks/use-subjects";
import { useFacultyList } from "@/hooks/use-faculty";
import {
  useCreateTimetableSlot,
  useDeleteTimetableSlot,
  useSectionTimetable,
  useUpdateTimetableSlot,
} from "@/hooks/use-timetable";
import { ApiError } from "@/lib/api-client";
import type { DayOfWeek, TimetableSlot, TimetableSlotCreateInput } from "@/types/timetable";

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
];

const NONE = "none";

const SLOT_COLORS = [
  "bg-chart-1/10 border-l-chart-1 text-chart-1",
  "bg-chart-2/10 border-l-chart-2 text-chart-2",
  "bg-chart-3/10 border-l-chart-3 text-chart-3",
  "bg-chart-4/10 border-l-chart-4 text-chart-4",
  "bg-chart-5/10 border-l-chart-5 text-chart-5",
];

/** Deterministic color per subject so the same subject always looks the same. */
function colorForKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return SLOT_COLORS[hash % SLOT_COLORS.length];
}

function toHHMM(value: string): string {
  return value.slice(0, 5);
}

interface SlotFormTarget {
  mode: "create" | "edit";
  slot?: TimetableSlot;
  day?: DayOfWeek;
  startTime?: string;
  endTime?: string;
}

function SlotFormDialog({
  sectionId,
  target,
  onClose,
}: {
  sectionId: string;
  target: SlotFormTarget;
  onClose: () => void;
}) {
  const isEdit = target.mode === "edit" && target.slot;
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(
    target.slot?.day_of_week ?? target.day ?? "monday"
  );
  const [subjectId, setSubjectId] = useState(target.slot?.subject_id ?? NONE);
  const [facultyId, setFacultyId] = useState(target.slot?.faculty_id ?? NONE);
  const [startTime, setStartTime] = useState(
    target.slot ? toHHMM(target.slot.start_time) : target.startTime ?? ""
  );
  const [endTime, setEndTime] = useState(
    target.slot ? toHHMM(target.slot.end_time) : target.endTime ?? ""
  );
  const [room, setRoom] = useState(target.slot?.room ?? "");

  const { data: subjectsData } = useSubjects({ page: 1, pageSize: 200 });
  const { data: facultyData } = useFacultyList({ page: 1, pageSize: 200 });

  const createSlot = useCreateTimetableSlot();
  const updateSlot = useUpdateTimetableSlot(target.slot?.id ?? "");
  const deleteSlot = useDeleteTimetableSlot();

  const isPending = createSlot.isPending || updateSlot.isPending || deleteSlot.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input: TimetableSlotCreateInput = {
      section_id: sectionId,
      subject_id: subjectId === NONE ? null : subjectId,
      faculty_id: facultyId === NONE ? null : facultyId,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      room: room || null,
    };
    try {
      if (isEdit && target.slot) {
        await updateSlot.mutateAsync(input);
        toast.success("Slot updated");
      } else {
        await createSlot.mutateAsync(input);
        toast.success("Slot added");
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save slot");
    }
  };

  const handleDelete = async () => {
    if (!target.slot) return;
    try {
      await deleteSlot.mutateAsync(target.slot.id);
      toast.success("Slot removed");
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to remove slot");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit slot" : "Add slot"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="slot-day">Day</Label>
              <Select value={dayOfWeek} onValueChange={(v) => setDayOfWeek(v as DayOfWeek)}>
                <SelectTrigger id="slot-day" className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="slot-start">Start time</Label>
                <Input
                  id="slot-start"
                  type="time"
                  className="mt-1.5"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="slot-end">End time</Label>
                <Input
                  id="slot-end"
                  type="time"
                  className="mt-1.5"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="slot-subject">Subject</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger id="slot-subject" className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {subjectsData?.data.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="slot-faculty">Faculty</Label>
              <Select value={facultyId} onValueChange={setFacultyId}>
                <SelectTrigger id="slot-faculty" className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {facultyData?.data.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="slot-room">Room</Label>
              <Input
                id="slot-room"
                className="mt-1.5"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="Room 204"
              />
            </div>
          </div>
          <DialogFooter>
            {isEdit && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
                className="sm:mr-auto"
              >
                <Trash2 />
                Remove
              </Button>
            )}
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : isEdit ? "Save changes" : "Add slot"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TimetablePage() {
  const [sectionId, setSectionId] = useState<string>("");
  const [target, setTarget] = useState<SlotFormTarget | null>(null);
  const permissions = usePermissions();
  const canWrite = permissions.has("timetable:slot:write");

  const { data: sectionsData, isLoading: sectionsLoading } = useSections({
    page: 1,
    pageSize: 100,
  });
  const { data: timetableData, isLoading: slotsLoading } = useSectionTimetable(
    sectionId || undefined
  );
  const { data: subjectsData } = useSubjects({ page: 1, pageSize: 200 });
  const { data: facultyData } = useFacultyList({ page: 1, pageSize: 200 });

  const subjectNameById = useMemo(
    () => new Map((subjectsData?.data ?? []).map((s) => [s.id, s.name])),
    [subjectsData]
  );
  const facultyNameById = useMemo(
    () => new Map((facultyData?.data ?? []).map((f) => [f.id, f.full_name])),
    [facultyData]
  );

  const slots = timetableData?.data ?? [];

  // Rows are the distinct (start, end) time ranges actually in use for this
  // section — the schedule isn't on a fixed grid (periods can vary in length),
  // so we derive rows from the data rather than assuming e.g. hourly slots.
  const timeRows = useMemo(() => {
    const seen = new Map<string, { start: string; end: string }>();
    for (const slot of slots) {
      const key = `${slot.start_time}-${slot.end_time}`;
      if (!seen.has(key)) seen.set(key, { start: slot.start_time, end: slot.end_time });
    }
    return Array.from(seen.values()).sort((a, b) => a.start.localeCompare(b.start));
  }, [slots]);

  const slotByCell = useMemo(() => {
    const map = new Map<string, TimetableSlot>();
    for (const slot of slots) {
      map.set(`${slot.day_of_week}-${slot.start_time}-${slot.end_time}`, slot);
    }
    return map;
  }, [slots]);

  return (
    <div className="flex flex-col h-full">
      <AcademicsSubNav />
      <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-5 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Timetable</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Weekly class schedule for a section.
          </p>
        </div>
        {canWrite && (
          <Button
            onClick={() => setTarget({ mode: "create" })}
            disabled={!sectionId}
          >
            <Plus />
            Add slot
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-muted/40">
        <Label htmlFor="section-select" className="shrink-0">
          Section
        </Label>
        <Select value={sectionId} onValueChange={setSectionId}>
          <SelectTrigger id="section-select" className="w-64">
            <SelectValue placeholder={sectionsLoading ? "Loading…" : "Select a section"} />
          </SelectTrigger>
          <SelectContent>
            {sectionsData?.data.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        {!sectionId && (
          <p className="text-center py-24 text-muted-foreground">
            Choose a section above to view its timetable.
          </p>
        )}

        {sectionId && slotsLoading && <Skeleton className="h-64 w-full" />}

        {sectionId && !slotsLoading && timeRows.length === 0 && (
          <p className="text-center py-24 text-muted-foreground">
            No slots scheduled for this section yet
            {canWrite ? " — use “Add slot” to build the schedule." : "."}
          </p>
        )}

        {sectionId && !slotsLoading && timeRows.length > 0 && (
          <div className="overflow-x-auto">
            <div
              className="grid min-w-[720px] gap-px rounded-lg border border-border bg-border"
              style={{ gridTemplateColumns: `96px repeat(${DAYS.length}, 1fr)` }}
            >
              <div className="bg-muted/60 p-2" />
              {DAYS.map((d) => (
                <div
                  key={d.value}
                  className="bg-muted/60 p-2 text-center text-xs font-medium text-muted-foreground"
                >
                  {d.label}
                </div>
              ))}

              {timeRows.map((row) => (
                <div key={`${row.start}-${row.end}`} className="contents">
                  <div className="bg-background p-2 text-xs text-muted-foreground whitespace-nowrap">
                    {toHHMM(row.start)}–{toHHMM(row.end)}
                  </div>
                  {DAYS.map((d) => {
                    const slot = slotByCell.get(`${d.value}-${row.start}-${row.end}`);
                    const colorClasses = slot ? colorForKey(slot.subject_id ?? slot.id) : "";
                    return (
                      <button
                        key={d.value}
                        type="button"
                        disabled={!canWrite}
                        onClick={() =>
                          setTarget(
                            slot
                              ? { mode: "edit", slot }
                              : {
                                  mode: "create",
                                  day: d.value,
                                  startTime: toHHMM(row.start),
                                  endTime: toHHMM(row.end),
                                }
                          )
                        }
                        className={cn(
                          "group p-2 text-left text-xs transition-colors disabled:cursor-default",
                          slot
                            ? cn("border-l-2", colorClasses)
                            : "bg-background enabled:hover:bg-muted",
                        )}
                      >
                        {slot ? (
                          <div className="space-y-0.5">
                            <div className="font-medium text-foreground">
                              {slot.subject_id
                                ? subjectNameById.get(slot.subject_id) ?? "Unknown subject"
                                : "Unassigned"}
                            </div>
                            {slot.faculty_id && (
                              <div className="text-muted-foreground">
                                {facultyNameById.get(slot.faculty_id) ?? "Unknown faculty"}
                              </div>
                            )}
                            {slot.room && <div className="text-muted-foreground">{slot.room}</div>}
                          </div>
                        ) : (
                          canWrite && (
                            <span className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                              + Add
                            </span>
                          )
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {target && sectionId && (
        <SlotFormDialog
          key={target.slot?.id ?? `new-${target.day}-${target.startTime}-${target.endTime}`}
          sectionId={sectionId}
          target={target}
          onClose={() => setTarget(null)}
        />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <RequirePermission permission="timetable:slot:read">
      <TimetablePage />
    </RequirePermission>
  );
}
