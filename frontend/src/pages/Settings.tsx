import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { Settings as SettingsType } from "../types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { Separator } from "../components/ui/Separator";
import { toNumber } from "../utils/format";
import { Save, CheckCircle, Loader2, Building2, Percent, DollarSign, Clock } from "lucide-react";
import { cn } from "../utils/cn";

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
      setTimeout(() => setSaved(false), 3000);
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Payroll Settings</h1>
        <p className="text-muted-foreground mt-1">
          Statutory deduction rates used when calculating salary. Changes apply the next time payroll
          is generated or refreshed.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Basic company details for payslips and reports</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {saved && (
              <div className="flex items-center gap-2 rounded-lg bg-green-100 p-3 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-400 animate-in fade-in slide-in-from-top-2">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                <span>Settings saved successfully</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={form.companyName}
                  onChange={(e) => set("companyName", e.target.value)}
                  placeholder="YUG Enterprises"
                />
              </div>
            </div>

            <Separator className="my-2" />

            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                  <Percent className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Provident Fund (PF)</CardTitle>
                  <CardDescription>Employee contribution rate and wage ceiling</CardDescription>
                </div>
              </div>
            </CardHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pfEmployeeRate">PF Employee Rate (%)</Label>
                <Input
                  id="pfEmployeeRate"
                  type="number"
                  step="0.01"
                  value={form.pfEmployeeRate}
                  onChange={(e) => set("pfEmployeeRate", e.target.value)}
                  placeholder="12.00"
                />
              </div>
              <div>
                <Label htmlFor="pfWageCeiling">PF Wage Ceiling (₹)</Label>
                <Input
                  id="pfWageCeiling"
                  type="number"
                  step="0.01"
                  value={form.pfWageCeiling}
                  onChange={(e) => set("pfWageCeiling", e.target.value)}
                  placeholder="15000"
                />
              </div>
            </div>

            <Separator className="my-2" />

            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <Percent className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Employee State Insurance (ESI)</CardTitle>
                  <CardDescription>Employee contribution rate and wage ceiling</CardDescription>
                </div>
              </div>
            </CardHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="esiEmployeeRate">ESI Employee Rate (%)</Label>
                <Input
                  id="esiEmployeeRate"
                  type="number"
                  step="0.01"
                  value={form.esiEmployeeRate}
                  onChange={(e) => set("esiEmployeeRate", e.target.value)}
                  placeholder="0.75"
                />
              </div>
              <div>
                <Label htmlFor="esiWageCeiling">ESI Wage Ceiling (₹)</Label>
                <Input
                  id="esiWageCeiling"
                  type="number"
                  step="0.01"
                  value={form.esiWageCeiling}
                  onChange={(e) => set("esiWageCeiling", e.target.value)}
                  placeholder="21000"
                />
              </div>
            </div>

            <Separator className="my-2" />

            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Other Deductions</CardTitle>
                  <CardDescription>LWF amount and overtime multiplier</CardDescription>
                </div>
              </div>
            </CardHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lwfAmount">LWF Amount (₹/month)</Label>
                <Input
                  id="lwfAmount"
                  type="number"
                  step="0.01"
                  value={form.lwfAmount}
                  onChange={(e) => set("lwfAmount", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="otMultiplier">OT Multiplier</Label>
                <Input
                  id="otMultiplier"
                  type="number"
                  step="0.01"
                  value={form.otMultiplier}
                  onChange={(e) => set("otMultiplier", e.target.value)}
                  placeholder="2.00"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button type="submit" loading={saveMutation.isPending} size="lg">
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}