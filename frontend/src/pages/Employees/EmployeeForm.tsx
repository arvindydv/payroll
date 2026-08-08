import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { Department, Employee } from "../../types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Label } from "../../components/ui/Label";
import { Separator } from "../../components/ui/Separator";
import { toNumber } from "../../utils/format";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { cn } from "../../utils/cn";

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

  const departmentOptions = departments.map((d) => ({
    value: d.id,
    label: d.name,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/employees")} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {isEdit ? "Edit Employee" : "Add Employee"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEdit ? "Update employee information and payroll details" : "Create a new employee record"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Enter the employee's personal details</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="employeeCode">Employee Code *</Label>
                <Input
                  id="employeeCode"
                  required
                  value={form.employeeCode}
                  onChange={(e) => set("employeeCode", e.target.value)}
                  placeholder="EMP001"
                />
              </div>
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label htmlFor="fatherName">Father's Name</Label>
                <Input
                  id="fatherName"
                  value={form.fatherName}
                  onChange={(e) => set("fatherName", e.target.value)}
                  placeholder="Father's name"
                />
              </div>
              <div>
                <Label htmlFor="departmentId">Department</Label>
                <Select
                  id="departmentId"
                  value={form.departmentId}
                  onChange={(e) => set("departmentId", e.target.value)}
                  placeholder="Select department"
                  options={[{ value: "", label: "Unassigned" }, ...departmentOptions]}
                />
              </div>
              <div>
                <Label htmlFor="dateOfJoining">Date of Joining *</Label>
                <Input
                  id="dateOfJoining"
                  type="date"
                  required
                  value={form.dateOfJoining}
                  onChange={(e) => set("dateOfJoining", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => set("dateOfBirth", e.target.value)}
                />
              </div>
            </div>

            <Separator className="my-2" />

            <CardHeader className="pb-3">
              <CardTitle>Contact & Identification</CardTitle>
              <CardDescription>Optional identification numbers and contact information</CardDescription>
            </CardHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="esiNumber">ESI Number</Label>
                <Input
                  id="esiNumber"
                  value={form.esiNumber}
                  onChange={(e) => set("esiNumber", e.target.value)}
                  placeholder="ESI number"
                />
              </div>
              <div>
                <Label htmlFor="uanNumber">UAN Number</Label>
                <Input
                  id="uanNumber"
                  value={form.uanNumber}
                  onChange={(e) => set("uanNumber", e.target.value)}
                  placeholder="UAN number"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  id="status"
                  value={form.status}
                  onChange={(e) => set("status", e.target.value as "ACTIVE" | "INACTIVE")}
                  options={[
                    { value: "ACTIVE", label: "Active" },
                    { value: "INACTIVE", label: "Inactive" },
                  ]}
                />
              </div>
            </div>

            <Separator className="my-2" />

            <CardHeader className="pb-3">
              <CardTitle>Salary Components (₹/month)</CardTitle>
              <CardDescription>Monthly salary breakdown for payroll calculation</CardDescription>
            </CardHeader>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="basicSalary">Basic Salary *</Label>
                <Input
                  id="basicSalary"
                  type="number"
                  step="0.01"
                  required
                  value={form.basicSalary}
                  onChange={(e) => set("basicSalary", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="hra">HRA</Label>
                <Input
                  id="hra"
                  type="number"
                  step="0.01"
                  value={form.hra}
                  onChange={(e) => set("hra", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="conveyance">Conveyance</Label>
                <Input
                  id="conveyance"
                  type="number"
                  step="0.01"
                  value={form.conveyance}
                  onChange={(e) => set("conveyance", e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => navigate("/employees")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" loading={saveMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {isEdit ? "Update Employee" : "Save Employee"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}