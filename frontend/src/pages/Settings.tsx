import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { Settings as SettingsType } from "../types";
import { Card } from "../components/Card";
import { toNumber } from "../utils/format";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await api.get<SettingsType>("/settings")).data,
  });

  const [form, setForm] = useState({
    companyName: "",
    pfEmployeeRate: "",
    pfWageCeiling: "",
    esiEmployeeRate: "",
    esiWageCeiling: "",
    lwfAmount: "",
    otMultiplier: "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        companyName: data.companyName,
        pfEmployeeRate: String(toNumber(data.pfEmployeeRate) * 100),
        pfWageCeiling: String(toNumber(data.pfWageCeiling)),
        esiEmployeeRate: String(toNumber(data.esiEmployeeRate) * 100),
        esiWageCeiling: String(toNumber(data.esiWageCeiling)),
        lwfAmount: String(toNumber(data.lwfAmount)),
        otMultiplier: String(toNumber(data.otMultiplier)),
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () =>
      api.put("/settings", {
        companyName: form.companyName,
        pfEmployeeRate: parseFloat(form.pfEmployeeRate) / 100,
        pfWageCeiling: parseFloat(form.pfWageCeiling),
        esiEmployeeRate: parseFloat(form.esiEmployeeRate) / 100,
        esiWageCeiling: parseFloat(form.esiWageCeiling),
        lwfAmount: parseFloat(form.lwfAmount),
        otMultiplier: parseFloat(form.otMultiplier),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    saveMutation.mutate();
  }

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Payroll Settings</h1>
      <p className="text-sm text-slate-500 mt-1">
        Statutory deduction rates used when calculating salary. Changes apply the next time payroll
        is generated or refreshed.
      </p>

      <Card className="mt-6 max-w-lg p-6">
        {saved && (
          <div className="mb-4 rounded-md bg-green-50 text-green-700 text-sm px-3 py-2">
            Settings saved
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Company Name">
            <input
              value={form.companyName}
              onChange={(e) => set("companyName", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="PF Employee Rate (%)">
            <input
              type="number"
              step="0.01"
              value={form.pfEmployeeRate}
              onChange={(e) => set("pfEmployeeRate", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="PF Wage Ceiling (₹)">
            <input
              type="number"
              step="0.01"
              value={form.pfWageCeiling}
              onChange={(e) => set("pfWageCeiling", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="ESI Employee Rate (%)">
            <input
              type="number"
              step="0.01"
              value={form.esiEmployeeRate}
              onChange={(e) => set("esiEmployeeRate", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="ESI Wage Ceiling (₹)">
            <input
              type="number"
              step="0.01"
              value={form.esiWageCeiling}
              onChange={(e) => set("esiWageCeiling", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="LWF Amount (₹/month)">
            <input
              type="number"
              step="0.01"
              value={form.lwfAmount}
              onChange={(e) => set("lwfAmount", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="OT Multiplier">
            <input
              type="number"
              step="0.01"
              value={form.otMultiplier}
              onChange={(e) => set("otMultiplier", e.target.value)}
              className="input"
            />
          </Field>
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Save Settings
          </button>
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
