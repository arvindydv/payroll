import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { DashboardSummary } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { formatCurrency } from "../utils/format";
import { Users, UserCheck, CreditCard, Clock, TrendingUp } from "lucide-react";
import { cn } from "../utils/cn";
import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  color?: "primary" | "green" | "blue" | "purple" | "orange" | "red";
}

function StatCard({ label, value, icon, trend, trendUp, color = "primary" }: StatCardProps) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    green: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    orange: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
    red: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className={cn("p-3 rounded-xl", colorClasses[color])}>
            {icon}
          </div>
          {trend && (
            <div
              className={cn(
                "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                trendUp ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              )}
            >
              <TrendingUp className={cn("h-3 w-3", !trendUp && "rotate-180")} />
              {trend}
            </div>
          )}
        </div>
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className="text-3xl font-bold text-foreground">{value}</div>
      </CardHeader>
    </Card>
  );
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => (await api.get<DashboardSummary>("/dashboard/summary")).data,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-12 text-muted-foreground">No data available</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview for {data.month}/{data.year}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Employees"
          value={data.totalEmployees}
          icon={<Users className="h-5 w-5" />}
          color="primary"
        />
        <StatCard
          label="Present Today"
          value={data.presentToday}
          icon={<UserCheck className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          label="Payroll This Month"
          value={formatCurrency(data.payrollThisMonth)}
          icon={<CreditCard className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          label="Pending Draft Slips"
          value={data.pendingSlips}
          icon={<Clock className="h-5 w-5" />}
          color="orange"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
              Generate Payroll
            </button>
            <button className="px-4 py-2 text-sm font-medium text-green-600 bg-green-100 rounded-lg hover:bg-green-200 transition-colors">
              Mark Attendance
            </button>
            <button className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors">
              Add Employee
            </button>
            <button className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors">
              View Reports
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}