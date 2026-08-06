import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { SalarySlip } from "../../types";
import { Card } from "../../components/Card";
import { formatCurrency, MONTH_NAMES, toNumber } from "../../utils/format";

export default function PayrollRun() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [editing, setEditing] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const { data: slips = [], isLoading } = useQuery({
    queryKey: ["payroll", month, year],
    queryFn: async () => (await api.get<SalarySlip[]>("/payroll", { params: { month, year } })).data,
  });

  const generateMutation = useMutation({
    mutationFn: async () => api.post("/payroll/generate", null, { params: { month, year } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payroll", month, year] }),
  });

  const updateArrearsMutation = useMutation({
    mutationFn: async ({ id, arrears }: { id: string; arrears: number }) =>
      api.put(`/payroll/${id}`, { arrears }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payroll", month, year] }),
  });

  const finalizeMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/payroll/${id}/finalize`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payroll", month, year] }),
  });

  async function exportExcel() {
    const res = await api.get("/payroll/export", { params: { month, year }, responseType: "blob" });
    downloadBlob(res.data, `salary-${year}-${month}.xlsx`);
  }

  async function downloadPayslip(slipId: string, employeeCode?: string) {
    const res = await api.get(`/payroll/${slipId}/pdf`, { responseType: "blob" });
    downloadBlob(res.data, `payslip-${employeeCode ?? slipId}-${year}-${month}.pdf`);
  }

  function downloadBlob(data: Blob, filename: string) {
    const url = window.URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  const totals = slips.reduce(
    (acc, s) => ({
      gross: acc.gross + toNumber(s.grossPay),
      net: acc.net + toNumber(s.netPay),
    }),
    { gross: 0, net: 0 }
  );

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Payroll</h1>
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
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Generate / Refresh
          </button>
          <button
            onClick={exportExcel}
            disabled={slips.length === 0}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Export Excel
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 text-slate-500">Loading...</div>
      ) : slips.length === 0 ? (
        <Card className="mt-6 p-8 text-center text-slate-400">
          No salary slips for this month yet. Click "Generate / Refresh" to compute payroll from
          attendance.
        </Card>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-xl">
            <Card className="p-4">
              <div className="text-xs text-slate-500">Employees</div>
              <div className="text-lg font-semibold">{slips.length}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-slate-500">Total Gross</div>
              <div className="text-lg font-semibold">{formatCurrency(totals.gross)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-slate-500">Total Net Pay</div>
              <div className="text-lg font-semibold">{formatCurrency(totals.net)}</div>
            </Card>
          </div>

          <Card className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-3 py-2">Employee</th>
                  <th className="px-3 py-2">Days</th>
                  <th className="px-3 py-2">OT Hrs</th>
                  <th className="px-3 py-2">Gross</th>
                  <th className="px-3 py-2">Arrears</th>
                  <th className="px-3 py-2">PF</th>
                  <th className="px-3 py-2">ESI</th>
                  <th className="px-3 py-2">LWF</th>
                  <th className="px-3 py-2">Net Pay</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {slips.map((slip) => (
                  <tr key={slip.id}>
                    <td className="px-3 py-2 font-medium text-slate-800">
                      {slip.employee?.name}
                      <div className="text-xs text-slate-400">{slip.employee?.employeeCode}</div>
                    </td>
                    <td className="px-3 py-2">
                      {toNumber(slip.payableDays)}/{slip.daysInMonth}
                    </td>
                    <td className="px-3 py-2">{toNumber(slip.otHours)}</td>
                    <td className="px-3 py-2">{formatCurrency(slip.grossPay)}</td>
                    <td className="px-3 py-2">
                      {slip.status === "DRAFT" ? (
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={toNumber(slip.arrears)}
                          onChange={(e) =>
                            setEditing((s) => ({ ...s, [slip.id]: e.target.value }))
                          }
                          onBlur={() => {
                            const value = editing[slip.id];
                            if (value !== undefined) {
                              updateArrearsMutation.mutate({ id: slip.id, arrears: parseFloat(value || "0") });
                            }
                          }}
                          className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        formatCurrency(slip.arrears)
                      )}
                    </td>
                    <td className="px-3 py-2">{formatCurrency(slip.pfDeduction)}</td>
                    <td className="px-3 py-2">{formatCurrency(slip.esiDeduction)}</td>
                    <td className="px-3 py-2">{formatCurrency(slip.lwfDeduction)}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">
                      {formatCurrency(slip.netPay)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          slip.status === "FINALIZED"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {slip.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => downloadPayslip(slip.id, slip.employee?.employeeCode)}
                        className="text-brand-600 hover:underline"
                      >
                        Payslip
                      </button>
                      {slip.status === "DRAFT" && (
                        <button
                          onClick={() => finalizeMutation.mutate(slip.id)}
                          className="text-green-600 hover:underline"
                        >
                          Finalize
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
