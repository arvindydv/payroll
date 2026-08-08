import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { SalarySlip } from "../../types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/ui/Table";
import { Input } from "../../components/ui/Input";
import { formatCurrency, MONTH_NAMES, toNumber } from "../../utils/format";
import { CreditCard, Download, Upload, RefreshCw, FileText, Calculator, DollarSign, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "../../utils/cn";

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

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={status === "FINALIZED" ? "success" : "warning"}>
        {status === "FINALIZED" ? (
          <>
            <CheckCircle className="h-3 w-3 mr-1" />
            Finalized
          </>
        ) : (
          <>
            <AlertCircle className="h-3 w-3 mr-1" />
            Draft
          </>
        )}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payroll</h1>
          <p className="text-muted-foreground mt-1">Generate and manage salary slips</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
          <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Generate / Refresh
          </Button>
          <Button variant="outline" onClick={exportExcel} disabled={slips.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">Loading payroll data...</p>
            </div>
          </CardContent>
        </Card>
      ) : slips.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Calculator className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground">No salary slips for this month</h3>
                <p className="text-muted-foreground mt-1">Click "Generate / Refresh" to compute payroll from attendance</p>
              </div>
              <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} size="lg">
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate Payroll
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Employees</p>
                    <p className="text-2xl font-bold text-foreground">{slips.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Gross</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(totals.gross)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Net Pay</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(totals.net)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead className="text-center">Days</TableHead>
                      <TableHead className="text-center">OT Hrs</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">Arrears</TableHead>
                      <TableHead className="text-right">PF</TableHead>
                      <TableHead className="text-right">ESI</TableHead>
                      <TableHead className="text-right">LWF</TableHead>
                      <TableHead className="text-right">Net Pay</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-48 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slips.map((slip) => (
                      <TableRow key={slip.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-medium">
                              {slip.employee?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{slip.employee?.name}</p>
                              <p className="text-xs text-muted-foreground">{slip.employee?.employeeCode}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm">
                          {toNumber(slip.payableDays)}/{slip.daysInMonth}
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm">
                          {toNumber(slip.otHours)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-medium">
                          {formatCurrency(slip.grossPay)}
                        </TableCell>
                        <TableCell className="text-right">
                          {slip.status === "DRAFT" ? (
                            <Input
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
                              className="w-24 h-8 text-right text-sm"
                            />
                          ) : (
                            <span className="font-mono text-sm">{formatCurrency(slip.arrears)}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">
                          {formatCurrency(slip.pfDeduction)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">
                          {formatCurrency(slip.esiDeduction)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">
                          {formatCurrency(slip.lwfDeduction)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-bold text-foreground">
                          {formatCurrency(slip.netPay)}
                        </TableCell>
                        <TableCell>{getStatusBadge(slip.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => downloadPayslip(slip.id, slip.employee?.employeeCode)}
                              className="h-8 w-8"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            {slip.status === "DRAFT" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => finalizeMutation.mutate(slip.id)}
                                disabled={finalizeMutation.isPending}
                                className="text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Finalize
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}