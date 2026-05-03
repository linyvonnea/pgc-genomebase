"use client";

/**
 * Office Calendar — Admin Page
 *
 * Allows admins to manage:
 *   - Holidays      (red)   — office is closed, auto-message clients
 *   - Office Activities (amber) — events that may delay responses
 *   - Closures      (slate) — unscheduled / emergency closures
 *   - Weekend days  (sidebar checkbox) — which weekdays are non-working
 *
 * Firestore:
 *   officeCalendar/{id}   — events
 *   settings/officeCalendar — weekend config
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, getDaysInMonth, startOfMonth, getDay, addMonths, subMonths, isSameDay, parseISO, isToday } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Info,
  Save,
  X,
  Flag,
  PartyPopper,
  AlertTriangle,
  Clock,
} from "lucide-react";
import useAuth from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { PermissionGuard } from "@/components/PermissionGuard";
import { cn } from "@/lib/utils";
import {
  subscribeToOfficeEvents,
  addOfficeEvent,
  updateOfficeEvent,
  deleteOfficeEvent,
  getOfficeCalendarSettings,
  saveOfficeCalendarSettings,
  DEFAULT_OFFICE_HOURS,
} from "@/services/officeCalendarService";
import {
  OfficeDayEvent,
  OfficeEventType,
  OfficeHours,
  OFFICE_EVENT_LABELS,
  OFFICE_EVENT_COLORS,
} from "@/types/OfficeCalendar";

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_FULL  = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const EVENT_TYPE_ICONS: Record<OfficeEventType, React.ReactNode> = {
  holiday:         <Flag         className="h-3 w-3" />,
  activity:        <PartyPopper  className="h-3 w-3" />,
  closure:         <AlertTriangle className="h-3 w-3" />,
  partial_closure: <Clock        className="h-3 w-3" />,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface EventChipProps {
  event: OfficeDayEvent;
  onEdit: (e: OfficeDayEvent) => void;
  onDelete: (e: OfficeDayEvent) => void;
  canEdit: boolean;
}

function EventChip({ event, onEdit, onDelete, canEdit }: EventChipProps) {
  const c = OFFICE_EVENT_COLORS[event.type];
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-medium truncate max-w-full cursor-default group",
              c.bg, c.text, `border ${c.border}`
            )}
          >
            <span className="flex-shrink-0">{EVENT_TYPE_ICONS[event.type]}</span>
            <span className="truncate">{event.title}</span>
            {canEdit && (
              <span className="flex items-center gap-0.5 ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(event); }}
                  className="hover:text-blue-600 p-0.5 rounded"
                >
                  <Pencil className="h-2.5 w-2.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(event); }}
                  className="hover:text-red-600 p-0.5 rounded"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="font-semibold text-xs">{event.title}</p>
          {event.description && <p className="text-xs text-slate-400 mt-0.5">{event.description}</p>}
          {event.recurringYearly && <p className="text-xs text-amber-400 mt-0.5">Recurs every year</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Main Page Wrapper ────────────────────────────────────────────────────────

export default function OfficeCalendarPage() {
  return (
    <PermissionGuard module="officeCalendar" action="view">
      <OfficeCalendarContent />
    </PermissionGuard>
  );
}

// ─── Main Content ─────────────────────────────────────────────────────────────

function OfficeCalendarContent() {
  const { user, adminInfo } = useAuth();
  const { canEdit, canDelete, canCreate } = usePermissions(adminInfo?.role);

  // ── State ──────────────────────────────────────────────────────────────────
  const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [allEvents, setAllEvents]         = useState<OfficeDayEvent[]>([]);
  const [weekendDays, setWeekendDays]     = useState<number[]>([0, 6]);
  const [officeHours, setOfficeHours]     = useState<OfficeHours>(DEFAULT_OFFICE_HOURS);
  const [savingWeekends, setSavingWeekends] = useState(false);
  const [savingHours, setSavingHours]     = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen]         = useState(false);
  const [deleteTarget, setDeleteTarget]     = useState<OfficeDayEvent | null>(null);
  const [selectedDate, setSelectedDate]     = useState<string | null>(null);
  const [editingEvent, setEditingEvent]     = useState<OfficeDayEvent | null>(null);
  const [saving, setSaving]                 = useState(false);

  // Form state
  const [form, setForm] = useState<{
    type: OfficeEventType;
    title: string;
    description: string;
    recurringYearly: boolean;
    closedFrom: number;
    closedUntil: number;
  }>({ type: "holiday", title: "", description: "", recurringYearly: false, closedFrom: 12, closedUntil: 13 });

  // ── Real-time events subscription ─────────────────────────────────────────
  useEffect(() => {
    const unsub = subscribeToOfficeEvents(setAllEvents);
    return unsub;
  }, []);

  // ── Load weekend settings ──────────────────────────────────────────────────
  useEffect(() => {
    getOfficeCalendarSettings().then((s) => {
      setWeekendDays(s.weekendDays);
      setOfficeHours(s.officeHours ?? DEFAULT_OFFICE_HOURS);
      setLoadingSettings(false);
    });
  }, []);

  // ── Calendar grid computation ─────────────────────────────────────────────
  const { year, month, daysInMonth, firstDayOfWeek, calCells } = useMemo(() => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const dim = getDaysInMonth(currentMonth);
    const fdow = getDay(startOfMonth(currentMonth));
    // Build a grid of { day: number | null } cells (always 6 weeks = 42 cells)
    const cells: (number | null)[] = [];
    for (let i = 0; i < fdow; i++) cells.push(null);
    for (let d = 1; d <= dim; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return { year: y, month: m, daysInMonth: dim, firstDayOfWeek: fdow, calCells: cells };
  }, [currentMonth]);

  // ── Events grouped by date string ─────────────────────────────────────────
  const eventsByDate = useMemo(() => {
    const map = new Map<string, OfficeDayEvent[]>();
    for (const ev of allEvents) {
      // Direct date match
      if (!map.has(ev.date)) map.set(ev.date, []);
      map.get(ev.date)!.push(ev);

      // Recurring yearly: also appear in current year
      if (ev.recurringYearly) {
        const [oy, m_, d_] = ev.date.split("-");
        const thisYearDate = `${year}-${m_}-${d_}`;
        if (thisYearDate !== ev.date) {
          if (!map.has(thisYearDate)) map.set(thisYearDate, []);
          // Avoid duplicates
          if (!map.get(thisYearDate)!.find((x) => x.id === ev.id)) {
            map.get(thisYearDate)!.push(ev);
          }
        }
      }
    }
    return map;
  }, [allEvents, year]);

  // ── Upcoming events (rest of chosen month) ────────────────────────────────
  const monthEvents = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const direct = allEvents.filter((e) => e.date.startsWith(prefix));
    const recurring = allEvents.filter((e) => {
      if (!e.recurringYearly) return false;
      const [, em, ed] = e.date.split("-");
      const thisYearDate = `${year}-${em}-${ed}`;
      return thisYearDate.startsWith(prefix) && !direct.find((d) => d.id === e.id);
    });
    return [...direct, ...recurring].sort((a, b) => a.date.localeCompare(b.date));
  }, [allEvents, year, month]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openAddDialog = useCallback((dateStr: string) => {
    setEditingEvent(null);
    setSelectedDate(dateStr);
    setForm({ type: "holiday", title: "", description: "", recurringYearly: false, closedFrom: 12, closedUntil: 13 });
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((ev: OfficeDayEvent) => {
    setEditingEvent(ev);
    setSelectedDate(ev.date);
    setForm({
      type: ev.type,
      title: ev.title,
      description: ev.description ?? "",
      recurringYearly: ev.recurringYearly ?? false,
      closedFrom: ev.closedFrom ?? 12,
      closedUntil: ev.closedUntil ?? 13,
    });
    setDialogOpen(true);
  }, []);

  const handleSaveEvent = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    if (!selectedDate) return;

    setSaving(true);
    try {
      if (editingEvent) {
        await updateOfficeEvent(editingEvent.id, {
          type: form.type,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          recurringYearly: form.recurringYearly,
          ...(form.type === "partial_closure"
            ? { closedFrom: form.closedFrom, closedUntil: form.closedUntil }
            : { closedFrom: undefined, closedUntil: undefined }),
        });
        toast.success("Event updated.");
      } else {
        await addOfficeEvent({
          date: selectedDate,
          type: form.type,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          recurringYearly: form.recurringYearly,
          ...(form.type === "partial_closure"
            ? { closedFrom: form.closedFrom, closedUntil: form.closedUntil }
            : {}),
          createdBy: user?.email ?? "unknown",
        });
        toast.success("Event added.");
      }
      setDialogOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save event.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteOfficeEvent(deleteTarget.id);
      toast.success("Event deleted.");
    } catch {
      toast.error("Failed to delete event.");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleToggleWeekend = (day: number) => {
    setWeekendDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleSaveWeekends = async () => {
    setSavingWeekends(true);
    try {
      await saveOfficeCalendarSettings({ weekendDays }, user?.email ?? "unknown");
      toast.success("Weekend settings saved.");
    } catch {
      toast.error("Failed to save weekend settings.");
    } finally {
      setSavingWeekends(false);
    }
  };

  const handleSaveOfficeHours = async () => {
    if (officeHours.start >= officeHours.end) {
      toast.error("Opening time must be before closing time.");
      return;
    }
    setSavingHours(true);
    try {
      await saveOfficeCalendarSettings({ officeHours }, user?.email ?? "unknown");
      toast.success("Office hours saved.");
    } catch {
      toast.error("Failed to save office hours.");
    } finally {
      setSavingHours(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────── Render

  return (
    <div className="p-6 space-y-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-[#166FB5]" />
            Office Calendar
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage holidays, activities, and closures. This data is used to inform clients about office availability.
          </p>
        </div>
        {/* Legend */}
        <div className="hidden md:flex items-center gap-3 text-xs text-slate-500">
          {(Object.keys(OFFICE_EVENT_LABELS) as OfficeEventType[]).map((t) => {
            const c = OFFICE_EVENT_COLORS[t];
            return (
              <span key={t} className="flex items-center gap-1">
                <span className={cn("h-2.5 w-2.5 rounded-full flex-shrink-0", c.dot)} />
                {OFFICE_EVENT_LABELS[t]}
              </span>
            );
          })}
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-200 flex-shrink-0" />
            Weekend
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        {/* ── Calendar ─────────────────────────────────────────────────────── */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-base font-bold text-slate-800 min-w-[150px] text-center">
                  {format(currentMonth, "MMMM yyyy")}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(startOfMonth(new Date()))}
                className="text-xs h-7"
              >
                Today
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 border-b border-slate-100">
              {WEEKDAY_NAMES.map((dn, i) => (
                <div
                  key={dn}
                  className={cn(
                    "text-center text-xs font-semibold py-2 text-slate-500",
                    weekendDays.includes(i) && "text-sky-400"
                  )}
                >
                  {dn}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
              {calCells.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="min-h-[90px] bg-slate-50/40" />;
                }

                const dateStr = toDateStr(year, month, day);
                const dayEvents = eventsByDate.get(dateStr) ?? [];
                const isWeekend = weekendDays.includes(new Date(year, month, day).getDay());
                const todayMark = isToday(new Date(year, month, day));

                return (
                  <div
                    key={dateStr}
                    className={cn(
                      "min-h-[90px] p-1.5 flex flex-col gap-0.5 transition-colors",
                      isWeekend ? "bg-sky-50/50" : "bg-white",
                      canCreate("officeCalendar") && "hover:bg-slate-50 cursor-pointer group"
                    )}
                    onClick={() => canCreate("officeCalendar") && openAddDialog(dateStr)}
                  >
                    {/* Day number */}
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "text-xs font-semibold h-5 w-5 flex items-center justify-center rounded-full",
                          todayMark ? "bg-[#166FB5] text-white" : "text-slate-600"
                        )}
                      >
                        {day}
                      </span>
                      {canCreate("officeCalendar") && (
                        <Plus className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>

                    {/* Event chips (show up to 2, then "+N more") */}
                    {dayEvents.slice(0, 2).map((ev) => (
                      <EventChip
                        key={ev.id}
                        event={ev}
                        onEdit={openEditDialog}
                        onDelete={setDeleteTarget}
                        canEdit={canEdit("officeCalendar")}
                      />
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[10px] text-slate-400 pl-1">
                        +{dayEvents.length - 2} more
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── Right sidebar ────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Weekend Configuration */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700">
                Weekend / Non-Working Days
              </CardTitle>
              <CardDescription className="text-xs">
                Select which days of the week are non-working. These days will appear highlighted on the calendar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {WEEKDAY_FULL.map((name, i) => (
                  <label
                    key={name}
                    className={cn(
                      "flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer text-xs transition-colors select-none",
                      weekendDays.includes(i)
                        ? "border-sky-300 bg-sky-50 text-sky-700 font-medium"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={weekendDays.includes(i)}
                      onChange={() => canEdit("officeCalendar") && handleToggleWeekend(i)}
                      disabled={!canEdit("officeCalendar")}
                    />
                    <span
                      className={cn(
                        "h-3.5 w-3.5 rounded border-2 flex items-center justify-center flex-shrink-0",
                        weekendDays.includes(i) ? "border-sky-400 bg-sky-400" : "border-slate-300"
                      )}
                    >
                      {weekendDays.includes(i) && (
                        <svg viewBox="0 0 12 12" className="h-2 w-2 fill-white">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    {name}
                  </label>
                ))}
              </div>
              {canEdit("officeCalendar") && (
                <Button
                  size="sm"
                  onClick={handleSaveWeekends}
                  disabled={savingWeekends}
                  className="w-full h-8 text-xs bg-[#166FB5] hover:bg-[#166FB5]/90"
                >
                  {savingWeekends ? (
                    <><RefreshCw className="h-3 w-3 mr-1.5 animate-spin" />Saving…</>
                  ) : (
                    <><Save className="h-3 w-3 mr-1.5" />Save Weekend Settings</>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Office Hours Configuration */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                Office Hours
              </CardTitle>
              <CardDescription className="text-xs">
                Working hours in Philippine Standard Time (PST). Used for chat auto-replies.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Opens at</Label>
                  <Select
                    value={String(officeHours.start)}
                    onValueChange={(v) =>
                      canEdit("officeCalendar") && setOfficeHours((h) => ({ ...h, start: Number(v) }))
                    }
                    disabled={!canEdit("officeCalendar")}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Closes at</Label>
                  <Select
                    value={String(officeHours.end)}
                    onValueChange={(v) =>
                      canEdit("officeCalendar") && setOfficeHours((h) => ({ ...h, end: Number(v) }))
                    }
                    disabled={!canEdit("officeCalendar")}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-[10px] text-slate-400">
                Clients messaging outside these hours will receive an automated notice.
              </p>
              {canEdit("officeCalendar") && (
                <Button
                  size="sm"
                  onClick={handleSaveOfficeHours}
                  disabled={savingHours}
                  className="w-full h-8 text-xs bg-[#166FB5] hover:bg-[#166FB5]/90"
                >
                  {savingHours ? (
                    <><RefreshCw className="h-3 w-3 mr-1.5 animate-spin" />Saving…</>
                  ) : (
                    <><Save className="h-3 w-3 mr-1.5" />Save Office Hours</>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Month Events List */}
          <Card className="shadow-sm border-slate-200 flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700">
                {format(currentMonth, "MMMM yyyy")} Events
              </CardTitle>
              <CardDescription className="text-xs">
                {monthEvents.length === 0 ? "No events this month." : `${monthEvents.length} event${monthEvents.length > 1 ? "s" : ""} scheduled.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {monthEvents.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">No events this month</p>
                  {canCreate("officeCalendar") && (
                    <p className="text-xs mt-1">Click a day on the calendar to add one.</p>
                  )}
                </div>
              )}
              {monthEvents.map((ev) => {
                const c = OFFICE_EVENT_COLORS[ev.type];
                return (
                  <div
                    key={ev.id}
                    className={cn(
                      "flex items-start gap-2.5 p-2.5 rounded-lg border text-xs",
                      c.bg, c.border
                    )}
                  >
                    <span className={cn("h-2 w-2 rounded-full mt-1 flex-shrink-0", c.dot)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={cn("font-semibold truncate", c.text)}>{ev.title}</span>
                        {ev.recurringYearly && (
                          <Badge variant="outline" className="h-4 text-[9px] px-1 py-0 flex-shrink-0">
                            Yearly
                          </Badge>
                        )}
                      </div>
                      <p className="text-slate-500 mt-0.5">
                        {format(parseISO(ev.date), "MMM d, yyyy")} · {OFFICE_EVENT_LABELS[ev.type]}
                        {ev.type === "partial_closure" && typeof ev.closedFrom === "number" && typeof ev.closedUntil === "number" && (
                          <span className="text-violet-500 ml-1">
                            ({ev.closedFrom === 0 ? "12:00 AM" : ev.closedFrom < 12 ? `${ev.closedFrom}:00 AM` : ev.closedFrom === 12 ? "12:00 PM" : `${ev.closedFrom - 12}:00 PM`}
                            {" – "}
                            {ev.closedUntil === 0 ? "12:00 AM" : ev.closedUntil < 12 ? `${ev.closedUntil}:00 AM` : ev.closedUntil === 12 ? "12:00 PM" : `${ev.closedUntil - 12}:00 PM`})
                          </span>
                        )}
                      </p>
                      {ev.description && (
                        <p className="text-slate-400 mt-0.5 line-clamp-2">{ev.description}</p>
                      )}
                    </div>
                    {canEdit("officeCalendar") && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => openEditDialog(ev)}
                          className="p-1 rounded hover:bg-white/60 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        {canDelete("officeCalendar") && (
                          <button
                            onClick={() => setDeleteTarget(ev)}
                            className="p-1 rounded hover:bg-white/60 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Info card */}
          <Card className="shadow-sm border-blue-100 bg-blue-50/50">
            <CardContent className="p-3">
              <div className="flex gap-2 text-xs text-blue-700">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">How this is used</p>
                  <ul className="space-y-1 text-blue-600 list-disc list-inside">
                    <li>Chat widget auto-informs clients when they message on holidays or closures.</li>
                    <li>Activities trigger a delay-notice message to clients.</li>
                    <li>Yearly-recurring events apply automatically each year.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Add / Edit Event Dialog ──────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[#166FB5]" />
              {editingEvent ? "Edit Event" : "Add Event"}
            </DialogTitle>
            {selectedDate && (
              <DialogDescription>
                {format(parseISO(selectedDate), "EEEE, MMMM d, yyyy")}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Event Type */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700">
                Event Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v as OfficeEventType }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(OFFICE_EVENT_LABELS) as [OfficeEventType, string][]).map(([val, label]) => {
                    const c = OFFICE_EVENT_COLORS[val];
                    return (
                      <SelectItem key={val} value={val}>
                        <div className="flex items-center gap-2">
                          <span className={cn("h-2 w-2 rounded-full", c.dot)} />
                          {label}
                          {val === "partial_closure" && (
                            <span className="text-[10px] text-slate-400 ml-1">(specific hours)</span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={
                  form.type === "holiday"
                    ? "e.g. Independence Day"
                    : form.type === "activity"
                    ? "e.g. Team Building Day"
                    : form.type === "partial_closure"
                    ? "e.g. Half Day — Morning Off"
                    : "e.g. Office Maintenance"
                }
                className="h-9"
                maxLength={80}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700">
                Description <span className="text-slate-400 font-normal">(optional)</span>
              </Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Additional details visible to clients in chat..."
                className="resize-none text-sm"
                rows={2}
                maxLength={300}
              />
            </div>

            {/* Partial closure time range */}
            {form.type === "partial_closure" && (
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-violet-500" />
                  No Office Hours <span className="text-red-500">*</span>
                </Label>
                <p className="text-xs text-slate-400">
                  The office will be unavailable during this time window on the selected day.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block">From</Label>
                    <Select
                      value={String(form.closedFrom)}
                      onValueChange={(v) => setForm((f) => ({ ...f, closedFrom: Number(v) }))}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block">Until</Label>
                    <Select
                      value={String(form.closedUntil)}
                      onValueChange={(v) => setForm((f) => ({ ...f, closedUntil: Number(v) }))}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i} value={String(i)} disabled={i <= form.closedFrom}>
                            {i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {form.closedFrom >= form.closedUntil && (
                  <p className="text-xs text-red-500">End time must be after start time.</p>
                )}
              </div>
            )}

            {/* Recurring yearly */}
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-slate-700">Repeat Every Year</p>
                <p className="text-xs text-slate-400">Automatically applies on the same date each year</p>
              </div>
              <Switch
                checked={form.recurringYearly}
                onCheckedChange={(v) => setForm((f) => ({ ...f, recurringYearly: v }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="h-9">
              Cancel
            </Button>
            <Button
              onClick={handleSaveEvent}
              disabled={saving || !form.title.trim() || (form.type === "partial_closure" && form.closedFrom >= form.closedUntil)}
              className="h-9 bg-[#166FB5] hover:bg-[#166FB5]/90"
            >
              {saving ? (
                <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving…</>
              ) : editingEvent ? (
                <><Save className="h-3.5 w-3.5 mr-1.5" />Update Event</>
              ) : (
                <><Plus className="h-3.5 w-3.5 mr-1.5" />Add Event</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>"{deleteTarget?.title}"</strong> on{" "}
              {deleteTarget ? format(parseISO(deleteTarget.date), "MMMM d, yyyy") : ""} will be permanently removed.
              {deleteTarget?.recurringYearly && (
                <span className="block mt-1 text-amber-600 font-medium">
                  This is a recurring yearly event. Deleting it removes all future occurrences.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
