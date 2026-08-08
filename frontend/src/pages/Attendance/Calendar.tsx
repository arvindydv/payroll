import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { AttendanceGrid, AttendanceStatus } from "../../types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { MONTH_NAMES } from "../../utils/format";
import { ChevronLeft, ChevronRight, Calendar, CheckCircle, XCircle, MinusCircle, Clock, Download, Upload, Save } from "lucide-react";
import { cn } from "../../utils/cn";

const STATUS_CYCLE: AttendanceStatus[] = [
  "PRESENT",
  "ABSENT",
  "HALF_DAY",
  "PAID_LEAVE",
  "UNPAID_LEAVE",
  "WEEKLY_OFF",
  "HOLIDAY",
];

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  PRESENT: "P",
  ABSENT: "A",
  HALF_DAY: "H",
  PAID_LEAVE: "PL",
  UNPAID_LEAVE: "UL",
  WEEKLY_OFF: "WO",
  HOLIDAY: "HO",
};

const STATUS_ICON: Record<AttendanceStatus, React.ReactNode> = {
  PRESENT: <CheckCircle className="h-4 w-4 text-green-600" />,
  ABSENT: <XCircle className="h-4 w-4 text-red-600" />,
  HALF_DAY: <MinusCircle className="h-4 w-4 text-amber-600" />,
  PAID_LEAVE: <Calendar className="h-4 w-4 text-blue-600" />,
  UNPAID_LEAVE: <Calendar className="h-4 w-4 text-slate-600" />,
  WEEKLY_OFF: <Clock className="h-4 w-4 text-purple-600" />,
  HOLIDAY: <Calendar className="h-4 w-4 text-pink-600" />,
};

const STATUS_COLOR: Record<AttendanceStatus, string> = {
  PRESENT: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  ABSENT: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  HALF_DAY: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  PAID_LEAVE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  UNPAID_LEAVE: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  WEEKLY_OFF: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  HOLIDAY: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
};

type PendingChange = { employeeId: string; date: string; status: AttendanceStatus; otHours: number };

export default function AttendanceCalendar() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [pending, setPending] = useState<Record<string, PendingChange>>({});
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["attendance-grid", month, year],
    queryFn: async () =>
      (await api.get<AttendanceGrid>("/attendance", { params: { month, year } })).data,
  });

  const recordMap = useMemo(() => {
    const map = new Map<string, { status: AttendanceStatus; otHours: number }>();
    data?.records.forEach((r) => {
      map.set(`${r.employeeId}_${r.date.slice(0, 10)}`, {
        status: r.status,
        otHours: Number(r.otHours),
      });
    });
    Object.values(pending).forEach((p) => {
      map.set(`${p.employeeId}_${p.date}`, { status: p.status, otHours: p.otHours });
    });
    return map;
  }, [data, pending]);

  const saveMutation = useMutation({
    mutationFn: async () =>
      api.post("/attendance/bulk", { records: Object.values(pending) }),
    onSuccess: () => {
      setPending({});
      queryClient.invalidateQueries({ queryKey: ["attendance-grid", month, year] });
    },
  });

  function cycleStatus(employeeId: string, date: string) {
    const current = recordMap.get(`${employeeId}_${date}`);
    const currentIndex = current ? STATUS_CYCLE.indexOf(current.status) : -1;
    const next = STATUS_CYCLE[(currentIndex + 1) % STATUS_CYCLE.length];
    setPending((p) => ({
      ...p,
      [`${employeeId}_${date}`]: {
        employeeId,
        date,
        status: next,
        otHours: current?.otHours ?? 0,
      },
    }));
  }

  function markAllPresent() {
    if (!data) return;
    const updates: Record<string, PendingChange> = {};
    for (const emp of data.employees) {
      for (let day = 1; day <= data.daysInMonth; day++) {
        const date = dateKey(year, month, day);
        updates[`${emp.id}_${date}`] = { employeeId: emp.id, date, status: "PRESENT", otHours: 0 };
      }
    }
    setPending((p) => ({ ...p, ...updates }));
  }

  function prevMonth() {
    setMonth((m) => (m === 1 ? (setYear((y) => y - 1), 12) : m - 1));
  }

  function nextMonth() {
    setMonth((m) => (m === 12 ? (setYear((y) => y + 1), 1) : m + 1));
  }

  const hasPending = Object.keys(pending).length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Attendance</h1>
          <p className="text-muted-foreground mt-1">Mark and manage employee attendance</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="icon" onClick={prevMonth} className="h-10 w-10">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-lg">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium text-foreground">{MONTH_NAMES[month - 1]} {year}</span>
          </div>
          <Button variant="outline" size="icon" onClick={nextMonth} className="h-10 w-10">
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            options={MONTH_NAMES.map((m, i) => ({ value: String(i + 1), label: m }))}
            className="w-36"
          />
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-20 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            min={2020}
            max={2030}
          />
          <Button variant="outline" onClick={markAllPresent} disabled={isLoading}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark All Present
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={!hasPending || saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes {hasPending && `(${Object.keys(pending).length})`}
          </Button>
        </div>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Status Legend:</span>
            {STATUS_CYCLE.map((s) => (
              <Badge key={s} variant="outline" className={cn("gap-1.5", STATUS_COLOR[s])}>
                {STATUS_ICON[s]}
                <span>{STATUS_LABEL[s]}</span>
              </Badge>
            ))}
            <span className="text-xs text-muted-foreground ml-2">Click a cell to cycle through statuses</span>
          </div>
        </CardContent>
      </Card>

      {isLoading || !data ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">Loading attendance data...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/50 sticky top-0 z-10">
                    <th className="sticky left-0 z-20 bg-background px-4 py-3 text-left font-medium text-foreground min-w-[200px] border-r border-border">
                      Employee
                    </th>
                    {Array.from({ length: data.daysInMonth }, (_, i) => i + 1).map((day) => (
                      <th key={day} className="px-2 py-3 text-center font-medium text-muted-foreground w-10 border-r border-border/50">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.employees.map((emp, rowIndex) => (
                    <tr key={emp.id} className={cn("border-b border-border/50 transition-colors", rowIndex % 2 === 0 && "bg-background", "hover:bg-muted/30")}>
                      <td className="sticky left-0 z-10 bg-background px-4 py-3 font-medium text-foreground min-w-[200px] border-r border-border whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-medium">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{emp.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{emp.employeeCode}</p>
                          </div>
                        </div>
                      </td>
                      {Array.from({ length: data.daysInMonth }, (_, i) => i + 1).map((day) => {
                        const date = dateKey(year, month, day);
                        const cell = recordMap.get(`${emp.id}_${date}`);
                        const isWeekend = new Date(year, month - 1, day).getDay() === 0 || new Date(year, month - 1, day).getDay() === 6;
                        
                        return (
                          <td key={day} className="px-1 py-1.5 text-center">
                            <button
                              onClick={() => cycleStatus(emp.id, date)}
                              className={cn(
                                "w-9 h-9 rounded-lg transition-all duration-150 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                                cell
                                  ? `${STATUS_COLOR[cell.status]} text-white font-semibold shadow-sm`
                                  : isWeekend
                                  ? "bg-slate-100 text-slate-400 dark:bg-slate-800 cursor-not-allowed"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              )}
                              title={cell ? `${STATUS_LABEL[cell.status]} - ${cell.status.replace("_", " ")}` : isWeekend ? "Weekend" : "Click to mark"}
                              disabled={isWeekend && !cell}
                            >
                              {cell ? (
                                <>
                                  {STATUS_ICON[cell.status]}
                                  <span className="ml-1">{STATUS_LABEL[cell.status]}</span>
                                </>
                              ) : isWeekend ? (
                                "—"
                              ) : (
                                "—"
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}