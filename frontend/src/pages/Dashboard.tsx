import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { DashboardSummary } from "../types";
import { StatCard } from "../components/Card";
import { formatCurrency } from "../utils/format";

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => (await api.get<DashboardSummary>("/dashboard/summary")).data,
  });

  if (isLoading || !data) {
    return <div className="text-slate-500">Loading dashboard...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p className="text-sm text-slate-500 mt-1">
        Overview for {data.month}/{data.year}
      </p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Employees" value={data.totalEmployees} />
        <StatCard label="Present Today" value={data.presentToday} />
        <StatCard
          label="Payroll This Month"
          value={formatCurrency(data.payrollThisMonth)}
          hint="Sum of net pay across finalized/draft slips"
        />
        <StatCard label="Pending Draft Slips" value={data.pendingSlips} />
      </div>
    </div>
  );
}
