import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { Department, Employee } from "../../types";
import { Card } from "../../components/Card";
import { toNumber } from "../../utils/format";

interface FormState {
  employeeCode: string;
  name: string;
  fatherName: string;
  departmentId: string;
  dateOfJoining: string;
  dateOfBirth: string;
  esiNumber: string;
  uanNumber: string;
  phone: string;
  basicSalary: string;
  hra: string;
  conveyance: string;
  status: "ACTIVE" | "INACTIVE";
}

const emptyForm: FormState = {
  employeeCode: "",
  name: "",
  fatherName: "",
  departmentId: "",
  dateOfJoining: "",
  dateOfBirth: "",
  esiNumber: "",
  uanNumber: "",
  phone: "",
  basicSalary: "",
  hra: "",
  conveyance: "",
  status: "ACTIVE",
};

export default function EmployeeForm() {
  const { id } = useParams();
  const isEdit = id && id !== "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => (await api.get<Department[]>("/departments")).data,
  });

  const { data: employee } = useQuery({
    queryKey: ["employee", id],
    queryFn: async () => (await api.get<Employee>(`/employees/${id}`)).data,
    enabled: Boolean(isEdit),
  });

  useEffect(() => {
    if (employee) {
      setForm({
        employeeCode: employee.employeeCode,
        name: employee.name,
        fatherName: employee.fatherName ?? "",
        departmentId: employee.departmentId ?? "",
        dateOfJoining: employee.dateOfJoining.slice(0, 10),
        dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.slice(0, 10) : "",
        esiNumber: employee.esiNumber ?? "",
        uanNumber: employee.uanNumber ?? "",
        phone: employee.phone ?? "",
        basicSalary: String(toNumber(employee.basicSalary)),
        hra: String(toNumber(employee.hra)),
        conveyance: String(toNumber(employee.conveyance)),
        status: employee.status,
      });
    }
  }, [employee]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        employeeCode: form.employeeCode,
        name: form.name,
        fatherName: form.fatherName || null,
        departmentId: form.departmentId || null,
        dateOfJoining: form.dateOfJoining,
        dateOfBirth: form.dateOfBirth || null,
        esiNumber: form.esiNumber || null,
        uanNumber: form.uanNumber || null,
        phone: form.phone || null,
        basicSalary: parseFloat(form.basicSalary || "0"),
        hra: parseFloat(form.hra || "0"),
        conveyance: parseFloat(form.conveyance || "0"),
        status: form.status,
      };
      if (isEdit) {
        return (await api.put(`/employees/${id}`, payload)).data;
      }
      return (await api.post("/employees", payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      navigate("/employees");
    },
    onError: (err: any) => setError(err?.response?.data?.error || "Could not save employee"),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    saveMutation.mutate();
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">
        {isEdit ? "Edit Employee" : "Add Employee"}
      </h1>

      <Card className="mt-6 max-w-3xl p-6">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Employee Code">
            <input
              required
              value={form.employeeCode}
              onChange={(e) => set("employeeCode", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Name">
            <input
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Father's Name">
            <input
              value={form.fatherName}
              onChange={(e) => set("fatherName", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Department">
            <select
              value={form.departmentId}
              onChange={(e) => set("departmentId", e.target.value)}
              className="input"
            >
              <option value="">Unassigned</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date of Joining">
            <input
              type="date"
              required
              value={form.dateOfJoining}
              onChange={(e) => set("dateOfJoining", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Date of Birth">
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => set("dateOfBirth", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="ESI Number">
            <input
              value={form.esiNumber}
              onChange={(e) => set("esiNumber", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="UAN Number">
            <input
              value={form.uanNumber}
              onChange={(e) => set("uanNumber", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Phone">
            <input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value as "ACTIVE" | "INACTIVE")}
              className="input"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </Field>
          <Field label="Basic Salary (₹/month)">
            <input
              type="number"
              step="0.01"
              required
              value={form.basicSalary}
              onChange={(e) => set("basicSalary", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="HRA (₹/month)">
            <input
              type="number"
              step="0.01"
              value={form.hra}
              onChange={(e) => set("hra", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Conveyance (₹/month)">
            <input
              type="number"
              step="0.01"
              value={form.conveyance}
              onChange={(e) => set("conveyance", e.target.value)}
              className="input"
            />
          </Field>

          <div className="sm:col-span-2 flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Save Employee
            </button>
            <button
              type="button"
              onClick={() => navigate("/employees")}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
