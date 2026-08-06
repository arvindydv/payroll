import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { Employee } from "../../types";
import { Card } from "../../components/Card";
import { formatCurrency, toNumber } from "../../utils/format";

export default function EmployeeList() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => (await api.get<Employee[]>("/employees")).data,
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/employees/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.employeeCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold text-slate-900">Employees</h1>
        <Link
          to="/employees/new"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Add Employee
        </Link>
      </div>

      <input
        placeholder="Search by name or code..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-4 w-full sm:max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
      />

      <Card className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Basic</th>
              <th className="px-4 py-3">HRA</th>
              <th className="px-4 py-3">Conveyance</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((emp) => (
              <tr key={emp.id}>
                <td className="px-4 py-3 text-slate-600">{emp.employeeCode}</td>
                <td className="px-4 py-3 font-medium text-slate-900">
                  <Link to={`/employees/${emp.id}`} className="hover:underline">
                    {emp.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{emp.department?.name ?? "-"}</td>
                <td className="px-4 py-3 text-slate-600">{formatCurrency(toNumber(emp.basicSalary))}</td>
                <td className="px-4 py-3 text-slate-600">{formatCurrency(toNumber(emp.hra))}</td>
                <td className="px-4 py-3 text-slate-600">{formatCurrency(toNumber(emp.conveyance))}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      emp.status === "ACTIVE"
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {emp.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-3">
                  <Link to={`/employees/${emp.id}`} className="text-brand-600 hover:underline">
                    Edit
                  </Link>
                  {emp.status === "ACTIVE" && (
                    <button
                      onClick={() => deactivateMutation.mutate(emp.id)}
                      className="text-red-600 hover:underline"
                    >
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                  No employees found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
