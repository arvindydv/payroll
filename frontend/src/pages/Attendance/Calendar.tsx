import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { AttendanceGrid, AttendanceStatus } from "../../types";
import { Card } from "../../components/Card";
import { MONTH_NAMES } from "../../utils/format";

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

const STATUS_COLOR: Record<AttendanceStatus, string> = {
  PRESENT: "bg-green-100 text-green-700",
  ABSENT: "bg-red-100 text-red-700",
  HALF_DAY: "bg-amber-100 text-amber-700",
  PAID_LEAVE: "bg-blue-100 text-blue-700",
  UNPAID_LEAVE: "bg-slate-200 text-slate-600",
  WEEKLY_OFF: "bg-purple-100 text-purple-700",
  HOLIDAY: "bg-pink-100 text-pink-700",
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

  const hasPending = Object.keys(pending).length > 0;

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Attendance</h1>
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-20 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
          <button
            onClick={markAllPresent}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            Mark all Present
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!hasPending || saveMutation.isPending}
            className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Save Changes {hasPending && `(${Object.keys(pending).length})`}
          </button>
        </div>
      </div>

      <div className="mt-3 flex gap-3 text-xs flex-wrap">
        {STATUS_CYCLE.map((s) => (
          <span key={s} className={`rounded px-2 py-0.5 ${STATUS_COLOR[s]}`}>
            {STATUS_LABEL[s]} = {s.replace("_", " ")}
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">Click a cell to cycle through statuses.</p>

      {isLoading || !data ? (
        <div className="mt-6 text-slate-500">Loading attendance...</div>
      ) : (
        <Card className="mt-4 overflow-x-auto">
          <table className="text-xs border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 bg-slate-50 px-3 py-2 text-left border-b border-slate-200 min-w-[160px]">
                  Employee
                </th>
                {Array.from({ length: data.daysInMonth }, (_, i) => i + 1).map((day) => (
                  <th key={day} className="px-1 py-2 border-b border-slate-200 text-slate-500 w-9">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.employees.map((emp) => (
                <tr key={emp.id} className="border-b border-slate-100">
                  <td className="sticky left-0 bg-white px-3 py-1.5 font-medium text-slate-800 whitespace-nowrap">
                    {emp.name}
                    <div className="text-slate-400 font-normal">{emp.employeeCode}</div>
                  </td>
                  {Array.from({ length: data.daysInMonth }, (_, i) => i + 1).map((day) => {
                    const date = dateKey(year, month, day);
                    const cell = recordMap.get(`${emp.id}_${date}`);
                    return (
                      <td key={day} className="p-0.5 text-center">
                        <button
                          onClick={() => cycleStatus(emp.id, date)}
                          className={`w-8 h-7 rounded text-[11px] font-semibold ${
                            cell ? STATUS_COLOR[cell.status] : "bg-slate-50 text-slate-300"
                          }`}
                          title={cell ? cell.status : "Unmarked"}
                        >
                          {cell ? STATUS_LABEL[cell.status] : "-"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
