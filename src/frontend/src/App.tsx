import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  IndianRupee,
  Loader2,
  Pencil,
  Play,
  Plus,
  Printer,
  Save,
  Target,
  Trash2,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import type { backendInterface } from "./backend";
import { useActor } from "./hooks/useActor";
import { formatIndianNumber, formatInr } from "./utils/formatInr";
import { type SimulationResult, runMonteCarlo } from "./utils/monteCarlo";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Client {
  id: bigint;
  name: string;
  age: bigint;
  sex: string;
  occupation?: string;
  income?: bigint;
  phone?: string;
  email?: string;
  createdAt: bigint;
}

interface Goal {
  id: bigint;
  clientId: bigint;
  name: string;
  presentValue: bigint;
  inflationRate: number;
  timeHorizon: bigint;
  strategy: string;
  strategyMean: number;
  strategySD: number;
  lumpSum: bigint;
  monthlySIP: bigint;
  monthlySIPStepUp: number;
  annualSIP: bigint;
  annualSIPStepUp: number;
  simCount: bigint;
  createdAt: bigint;
  updatedAt: bigint;
}

type View = "clients" | "goals" | "goal_detail" | "report";

const STRATEGIES = {
  Conservative: { mean: 7, sd: 8 },
  Moderate: { mean: 11, sd: 12 },
  Aggressive: { mean: 14, sd: 15 },
  Custom: { mean: 10, sd: 12 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcTargetCorpus(
  pv: number,
  inflation: number,
  years: number,
): number {
  return pv * (1 + inflation / 100) ** years;
}

function getSuccessBg(rate: number): string {
  if (rate >= 75) return "bg-emerald-50 border-emerald-200 text-emerald-800";
  if (rate >= 50) return "bg-amber-50 border-amber-200 text-amber-800";
  return "bg-red-50 border-red-200 text-red-800";
}

// ─── Form State ───────────────────────────────────────────────────────────────

interface ClientFormState {
  name: string;
  age: string;
  sex: string;
  occupation: string;
  income: string;
  phone: string;
  email: string;
}

interface GoalFormState {
  name: string;
  presentValue: string;
  inflationRate: string;
  timeHorizon: string;
  strategy: string;
  strategyMean: string;
  strategySD: string;
  lumpSum: string;
  monthlySIP: string;
  monthlySIPStepUp: string;
  annualSIP: string;
  annualSIPStepUp: string;
  simCount: string;
}

const DEFAULT_GOAL_FORM: GoalFormState = {
  name: "",
  presentValue: "",
  inflationRate: "6",
  timeHorizon: "10",
  strategy: "Moderate",
  strategyMean: "11",
  strategySD: "12",
  lumpSum: "0",
  monthlySIP: "",
  monthlySIPStepUp: "10",
  annualSIP: "0",
  annualSIPStepUp: "10",
  simCount: "1000",
};

// ─── Numeric Input ─────────────────────────────────────────────────────────────

function NumInput({
  value,
  onChange,
  placeholder,
  prefix,
  suffix,
  className,
  id,
  "data-ocid": dataOcid,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  className?: string;
  id?: string;
  "data-ocid"?: string;
}) {
  return (
    <div className="relative flex items-center">
      {prefix && (
        <span className="absolute left-3 text-muted-foreground text-sm font-medium pointer-events-none">
          {prefix}
        </span>
      )}
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${prefix ? "pl-7" : ""} ${suffix ? "pr-10" : ""} ${className ?? ""}`}
        data-ocid={dataOcid}
      />
      {suffix && (
        <span className="absolute right-3 text-muted-foreground text-sm pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

// ─── Client Form Dialog ────────────────────────────────────────────────────────

function ClientFormDialog({
  open,
  onClose,
  editClient,
  onSaved,
  backend,
}: {
  open: boolean;
  onClose: () => void;
  editClient: Client | null;
  onSaved: () => void;
  backend: backendInterface;
}) {
  const [form, setForm] = useState<ClientFormState>({
    name: "",
    age: "",
    sex: "",
    occupation: "",
    income: "",
    phone: "",
    email: "",
  });
  const [saving, setSaving] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: open is used as a reset trigger
  useEffect(() => {
    if (editClient) {
      setForm({
        name: editClient.name,
        age: String(Number(editClient.age)),
        sex: editClient.sex,
        occupation: editClient.occupation ?? "",
        income: editClient.income ? String(Number(editClient.income)) : "",
        phone: editClient.phone ?? "",
        email: editClient.email ?? "",
      });
    } else {
      setForm({
        name: "",
        age: "",
        sex: "Male",
        occupation: "",
        income: "",
        phone: "",
        email: "",
      });
    }
  }, [editClient, open]);

  const f = (field: keyof ClientFormState) => (v: string) =>
    setForm((p) => ({ ...p, [field]: v }));

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast.error("Client name is required");
      return;
    }
    if (!form.age || Number.isNaN(Number(form.age))) {
      toast.error("Valid age is required");
      return;
    }
    if (!form.sex) {
      toast.error("Please select sex");
      return;
    }
    setSaving(true);
    try {
      const args: Parameters<typeof backend.createClient> = [
        form.name.trim(),
        BigInt(Math.round(Number(form.age))),
        form.sex,
        form.occupation.trim() || null,
        form.income ? BigInt(Math.round(Number(form.income))) : null,
        form.phone.trim() || null,
        form.email.trim() || null,
      ];
      if (editClient) {
        await backend.updateClient(editClient.id, ...args);
        toast.success("Client updated");
      } else {
        await backend.createClient(...args);
        toast.success("Client added");
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.error("Failed to save client");
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-md mx-auto w-[95vw]"
        data-ocid="client_form.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display">
            {editClient ? "Edit Client" : "Add New Client"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cf-name">Full Name *</Label>
            <Input
              id="cf-name"
              value={form.name}
              onChange={(e) => f("name")(e.target.value)}
              placeholder="e.g. Rajesh Kumar"
              data-ocid="client_form.name_input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cf-age">Age *</Label>
              <NumInput
                id="cf-age"
                value={form.age}
                onChange={f("age")}
                placeholder="35"
                data-ocid="client_form.age_input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sex *</Label>
              <Select value={form.sex} onValueChange={f("sex")}>
                <SelectTrigger data-ocid="client_form.sex_select">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cf-occ">Occupation</Label>
            <Input
              id="cf-occ"
              value={form.occupation}
              onChange={(e) => f("occupation")(e.target.value)}
              placeholder="e.g. Software Engineer"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cf-income">Annual Income (₹)</Label>
            <NumInput
              id="cf-income"
              value={form.income}
              onChange={f("income")}
              prefix="₹"
              placeholder="1200000"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cf-phone">Phone</Label>
              <Input
                id="cf-phone"
                value={form.phone}
                onChange={(e) => f("phone")(e.target.value)}
                placeholder="+91 98765 43210"
                inputMode="tel"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cf-email">Email</Label>
              <Input
                id="cf-email"
                value={form.email}
                onChange={(e) => f("email")(e.target.value)}
                placeholder="raj@email.com"
                inputMode="email"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            data-ocid="client_form.cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            data-ocid="client_form.submit_button"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {editClient ? "Save Changes" : "Add Client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Clients Screen ─────────────────────────────────────────────────────────────

function ClientsScreen({
  clients,
  activeClientId,
  setActiveClientId,
  onEdit,
  onDelete,
  onAdd,
  loading,
}: {
  clients: Client[];
  activeClientId: bigint | null;
  setActiveClientId: (id: bigint) => void;
  onEdit: (c: Client) => void;
  onDelete: (c: Client) => void;
  onAdd: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      <header className="bg-primary text-primary-foreground px-4 py-4 no-print">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight">
              CFP Goal Planner
            </h1>
            <p className="text-primary-foreground/70 text-sm mt-0.5">
              Client Management
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={onAdd}
            className="bg-white/15 hover:bg-white/25 text-white border-white/20"
            data-ocid="clients.add_button"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Client
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div
            className="flex items-center justify-center h-40"
            data-ocid="clients.loading_state"
          >
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : clients.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-56 space-y-4"
            data-ocid="clients.empty_state"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-display font-semibold text-foreground">
                No clients yet
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                Tap "Add Client" to get started
              </p>
            </div>
            <Button onClick={onAdd} data-ocid="clients.add_button">
              <Plus className="w-4 h-4 mr-2" /> Add Your First Client
            </Button>
          </div>
        ) : (
          clients.map((client, idx) => {
            const isActive = activeClientId === client.id;
            return (
              <button
                key={String(client.id)}
                type="button"
                className={`relative w-full text-left rounded-xl border-2 bg-card shadow-card cursor-pointer transition-all duration-150 ${
                  isActive
                    ? "border-primary shadow-glow"
                    : "border-border hover:border-primary/40 hover:shadow-card-hover"
                }`}
                onClick={() => setActiveClientId(client.id)}
                data-ocid={`clients.item.${idx + 1}`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display font-semibold text-base truncate">
                          {client.name}
                        </h3>
                        {isActive && (
                          <Badge className="bg-primary text-primary-foreground text-xs shrink-0">
                            Active
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                        <span>{Number(client.age)} yrs</span>
                        <span>·</span>
                        <span>{client.sex}</span>
                        {client.occupation && (
                          <>
                            <span>·</span>
                            <span className="truncate">
                              {client.occupation}
                            </span>
                          </>
                        )}
                      </div>
                      {client.income && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Income: {formatInr(Number(client.income), true)}/yr
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(client);
                        }}
                        data-ocid={`clients.edit_button.${idx + 1}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(client);
                        }}
                        data-ocid={`clients.delete_button.${idx + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </main>
    </div>
  );
}

// ─── Goals Screen ──────────────────────────────────────────────────────────────

function GoalsScreen({
  client,
  goals,
  onAdd,
  onEdit,
  onDelete,
  onOpen,
  loading,
}: {
  client: Client | null;
  goals: Goal[];
  onAdd: () => void;
  onEdit: (g: Goal) => void;
  onDelete: (g: Goal) => void;
  onOpen: (g: Goal) => void;
  loading: boolean;
}) {
  if (!client) {
    return (
      <div className="flex flex-col h-full">
        <header className="bg-primary text-primary-foreground px-4 py-4">
          <h1 className="font-display text-xl font-bold">Goals</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-6 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="font-display font-semibold">No client selected</p>
            <p className="text-muted-foreground text-sm mt-1">
              Go to Clients tab and select a client first
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="bg-primary text-primary-foreground px-4 py-4 no-print">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-primary-foreground/70 text-xs uppercase tracking-wider font-medium">
              Goals for
            </p>
            <h1 className="font-display text-xl font-bold truncate">
              {client.name}
            </h1>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={onAdd}
            className="bg-white/15 hover:bg-white/25 text-white border-white/20 shrink-0 ml-2"
            data-ocid="goals.add_button"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Goal
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : goals.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-56 space-y-4"
            data-ocid="goals.empty_state"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-display font-semibold">No goals yet</p>
              <p className="text-muted-foreground text-sm mt-1">
                Add a financial goal for {client.name}
              </p>
            </div>
            <Button onClick={onAdd} data-ocid="goals.add_button">
              <Plus className="w-4 h-4 mr-2" /> Add First Goal
            </Button>
          </div>
        ) : (
          goals.map((goal, idx) => {
            const target = calcTargetCorpus(
              Number(goal.presentValue),
              goal.inflationRate,
              Number(goal.timeHorizon),
            );
            return (
              <button
                key={String(goal.id)}
                type="button"
                className="w-full text-left rounded-xl border-2 border-border bg-card shadow-card cursor-pointer hover:border-primary/40 hover:shadow-card-hover transition-all duration-150"
                onClick={() => onOpen(goal)}
                data-ocid={`goals.item.${idx + 1}`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold text-base truncate">
                        {goal.name}
                      </h3>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <IndianRupee className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="text-sm font-medium text-primary">
                            {formatInr(target, true)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            target corpus
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <span>{goal.strategy}</span>
                          <span>·</span>
                          <span>{Number(goal.timeHorizon)} yr horizon</span>
                          {Number(goal.monthlySIP) > 0 && (
                            <>
                              <span>·</span>
                              <span>
                                SIP {formatInr(Number(goal.monthlySIP), true)}
                                /mo
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(goal);
                        }}
                        data-ocid={`goals.edit_button.${idx + 1}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(goal);
                        }}
                        data-ocid={`goals.delete_button.${idx + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </main>
    </div>
  );
}

// ─── Goal Form Dialog ──────────────────────────────────────────────────────────

function GoalFormDialog({
  open,
  onClose,
  editGoal,
  clientId,
  onSaved,
  backend,
}: {
  open: boolean;
  onClose: () => void;
  editGoal: Goal | null;
  clientId: bigint | null;
  onSaved: (goal: Goal) => void;
  backend: backendInterface;
}) {
  const [form, setForm] = useState<GoalFormState>(DEFAULT_GOAL_FORM);
  const [saving, setSaving] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: open is used as a reset trigger
  useEffect(() => {
    if (editGoal) {
      setForm({
        name: editGoal.name,
        presentValue: String(Number(editGoal.presentValue)),
        inflationRate: String(editGoal.inflationRate),
        timeHorizon: String(Number(editGoal.timeHorizon)),
        strategy: editGoal.strategy,
        strategyMean: String(editGoal.strategyMean),
        strategySD: String(editGoal.strategySD),
        lumpSum: String(Number(editGoal.lumpSum)),
        monthlySIP: String(Number(editGoal.monthlySIP)),
        monthlySIPStepUp: String(editGoal.monthlySIPStepUp),
        annualSIP: String(Number(editGoal.annualSIP)),
        annualSIPStepUp: String(editGoal.annualSIPStepUp),
        simCount: String(Number(editGoal.simCount)),
      });
    } else {
      setForm(DEFAULT_GOAL_FORM);
    }
  }, [editGoal, open]);

  const f = (field: keyof GoalFormState) => (v: string) =>
    setForm((p) => ({ ...p, [field]: v }));

  function setStrategy(strat: string) {
    const s = STRATEGIES[strat as keyof typeof STRATEGIES];
    setForm((p) => ({
      ...p,
      strategy: strat,
      strategyMean: s ? String(s.mean) : p.strategyMean,
      strategySD: s ? String(s.sd) : p.strategySD,
    }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast.error("Goal name is required");
      return;
    }
    if (!form.presentValue || Number(form.presentValue) <= 0) {
      toast.error("Present value must be > 0");
      return;
    }
    if (!clientId) {
      toast.error("No client selected");
      return;
    }
    setSaving(true);
    try {
      const args = [
        form.name.trim(),
        BigInt(Math.round(Number(form.presentValue))),
        Number(form.inflationRate) || 6,
        BigInt(Math.round(Number(form.timeHorizon)) || 10),
        form.strategy,
        Number(form.strategyMean) || 11,
        Number(form.strategySD) || 12,
        BigInt(Math.round(Number(form.lumpSum)) || 0),
        BigInt(Math.round(Number(form.monthlySIP)) || 0),
        Number(form.monthlySIPStepUp) || 10,
        BigInt(Math.round(Number(form.annualSIP)) || 0),
        Number(form.annualSIPStepUp) || 10,
        BigInt(Number(form.simCount) || 1000),
      ] as const;

      let savedId: bigint;
      if (editGoal) {
        await backend.updateGoal(editGoal.id, clientId, ...args);
        savedId = editGoal.id;
        toast.success("Goal updated");
      } else {
        savedId = await backend.createGoal(clientId, ...args);
        toast.success("Goal created");
      }

      const saved = await backend.getGoal(savedId);
      onSaved(saved as Goal);
      onClose();
    } catch (e) {
      toast.error("Failed to save goal");
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  const target = calcTargetCorpus(
    Number(form.presentValue) || 0,
    Number(form.inflationRate) || 0,
    Number(form.timeHorizon) || 0,
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md mx-auto w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {editGoal ? "Edit Goal" : "Add New Goal"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Goal Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => f("name")(e.target.value)}
              placeholder="e.g. Retirement Fund, Child Education"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Present Value (₹) *</Label>
              <NumInput
                value={form.presentValue}
                onChange={f("presentValue")}
                prefix="₹"
                placeholder="5000000"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Inflation Rate (%)</Label>
              <NumInput
                value={form.inflationRate}
                onChange={f("inflationRate")}
                suffix="%"
                placeholder="6"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Time Horizon (years)</Label>
            <NumInput
              value={form.timeHorizon}
              onChange={f("timeHorizon")}
              suffix="yrs"
              placeholder="10"
            />
          </div>

          {target > 0 && (
            <div className="rounded-xl bg-primary/8 border border-primary/20 p-3.5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Target Corpus (Inflation-Adjusted)
              </p>
              <p className="font-display text-2xl font-bold text-primary mt-0.5">
                {formatInr(target, true)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatInr(target)}
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Investment Strategy</Label>
            <Select value={form.strategy} onValueChange={setStrategy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(STRATEGIES).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Expected Return (%)</Label>
              <NumInput
                value={form.strategyMean}
                onChange={f("strategyMean")}
                suffix="%"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Std Deviation (%)</Label>
              <NumInput
                value={form.strategySD}
                onChange={f("strategySD")}
                suffix="%"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label>Lump Sum Investment (₹)</Label>
            <NumInput
              value={form.lumpSum}
              onChange={f("lumpSum")}
              prefix="₹"
              placeholder="0"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Monthly SIP (₹)</Label>
              <NumInput
                value={form.monthlySIP}
                onChange={f("monthlySIP")}
                prefix="₹"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Step-Up/yr (%)</Label>
              <NumInput
                value={form.monthlySIPStepUp}
                onChange={f("monthlySIPStepUp")}
                suffix="%"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Annual SIP (₹)</Label>
              <NumInput
                value={form.annualSIP}
                onChange={f("annualSIP")}
                prefix="₹"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Step-Up/yr (%)</Label>
              <NumInput
                value={form.annualSIPStepUp}
                onChange={f("annualSIPStepUp")}
                suffix="%"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Simulation Paths</Label>
            <div className="flex rounded-lg border border-border overflow-hidden">
              {["1000", "10000"].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    form.simCount === n
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => f("simCount")(n)}
                  data-ocid={`goal_form.sim_count_${n}_toggle`}
                >
                  {n === "1000" ? "1,000" : "10,000"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {editGoal ? "Save Changes" : "Create Goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Percentile Card ──────────────────────────────────────────────────────────

function PercentileCard({
  label,
  value,
  target,
  highlight,
  dataOcid,
}: {
  label: string;
  value: number;
  target: number;
  highlight?: boolean;
  dataOcid?: string;
}) {
  const met = value >= target;
  return (
    <div
      className={`rounded-xl border-2 p-3 text-center transition-all ${
        highlight ? "border-primary/30 bg-primary/5" : "border-border bg-card"
      }`}
      data-ocid={dataOcid}
    >
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
        {label}
      </p>
      <p
        className={`font-display text-base font-bold mt-1 ${highlight ? "text-primary" : "text-foreground"}`}
      >
        {formatInr(value, true)}
      </p>
      <div
        className={`flex items-center justify-center gap-1 mt-1.5 text-xs font-medium ${
          met ? "text-emerald-600" : "text-red-500"
        }`}
      >
        {met ? (
          <CheckCircle2 className="w-3 h-3" />
        ) : (
          <XCircle className="w-3 h-3" />
        )}
        {met ? "Goal Met" : "Below Target"}
      </div>
    </div>
  );
}

// ─── Custom Tooltip for Chart ─────────────────────────────────────────────────

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string | number;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-xl shadow-xl p-3 text-xs space-y-1 max-w-[200px]">
      <p className="font-semibold text-foreground mb-1.5">Year {label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-muted-foreground">{p.name}</span>
          </div>
          <span className="font-medium text-foreground">
            {formatInr(p.value, true)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Goal Detail View ──────────────────────────────────────────────────────────

function GoalDetailView({
  goal: initialGoal,
  client,
  onBack,
  onGoalUpdated,
  backend,
}: {
  goal: Goal;
  client: Client;
  onBack: () => void;
  onGoalUpdated: (g: Goal) => void;
  backend: backendInterface;
}) {
  const [form, setForm] = useState<GoalFormState>(() => ({
    name: initialGoal.name,
    presentValue: String(Number(initialGoal.presentValue)),
    inflationRate: String(initialGoal.inflationRate),
    timeHorizon: String(Number(initialGoal.timeHorizon)),
    strategy: initialGoal.strategy,
    strategyMean: String(initialGoal.strategyMean),
    strategySD: String(initialGoal.strategySD),
    lumpSum: String(Number(initialGoal.lumpSum)),
    monthlySIP: String(Number(initialGoal.monthlySIP)),
    monthlySIPStepUp: String(initialGoal.monthlySIPStepUp),
    annualSIP: String(Number(initialGoal.annualSIP)),
    annualSIPStepUp: String(initialGoal.annualSIPStepUp),
    simCount: String(Number(initialGoal.simCount)),
  }));
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [simRunning, setSimRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inputExpanded, setInputExpanded] = useState(true);
  const workerRef = useRef<Worker | null>(null);

  const f = (field: keyof GoalFormState) => (v: string) =>
    setForm((p) => ({ ...p, [field]: v }));

  function setStrategy(strat: string) {
    const s = STRATEGIES[strat as keyof typeof STRATEGIES];
    setForm((p) => ({
      ...p,
      strategy: strat,
      strategyMean: s ? String(s.mean) : p.strategyMean,
      strategySD: s ? String(s.sd) : p.strategySD,
    }));
  }

  const target = calcTargetCorpus(
    Number(form.presentValue) || 0,
    Number(form.inflationRate) || 0,
    Number(form.timeHorizon) || 0,
  );

  const runSim = useCallback(() => {
    const pv = Number(form.presentValue) || 0;
    const inflation = Number(form.inflationRate) || 6;
    const horizon = Number(form.timeHorizon) || 10;
    const mean = (Number(form.strategyMean) || 11) / 100;
    const sd = (Number(form.strategySD) || 12) / 100;
    const lumpSum = Number(form.lumpSum) || 0;
    const monthlySIP = Number(form.monthlySIP) || 0;
    const mStepUp = Number(form.monthlySIPStepUp) || 10;
    const annualSIP = Number(form.annualSIP) || 0;
    const aStepUp = Number(form.annualSIPStepUp) || 10;
    const simCount = Number(form.simCount) || 1000;
    const targetCorpus = calcTargetCorpus(pv, inflation, horizon);

    setSimRunning(true);

    // Run in a timeout to allow UI to update
    setTimeout(() => {
      try {
        const result = runMonteCarlo({
          presentValue: targetCorpus,
          timeHorizon: horizon,
          meanReturn: mean,
          sdReturn: sd,
          lumpSum,
          monthlySIP,
          monthlySIPStepUp: mStepUp,
          annualSIP,
          annualSIPStepUp: aStepUp,
          simCount,
        });
        setSimResult(result);
      } catch (e) {
        toast.error("Simulation failed");
        console.error(e);
      } finally {
        setSimRunning(false);
      }
    }, 30);
  }, [form]);

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Goal name is required");
      return;
    }
    setSaving(true);
    try {
      await backend.updateGoal(
        initialGoal.id,
        initialGoal.clientId,
        form.name.trim(),
        BigInt(Math.round(Number(form.presentValue))),
        Number(form.inflationRate),
        BigInt(Math.round(Number(form.timeHorizon))),
        form.strategy,
        Number(form.strategyMean),
        Number(form.strategySD),
        BigInt(Math.round(Number(form.lumpSum))),
        BigInt(Math.round(Number(form.monthlySIP))),
        Number(form.monthlySIPStepUp),
        BigInt(Math.round(Number(form.annualSIP))),
        Number(form.annualSIPStepUp),
        BigInt(Number(form.simCount)),
      );
      const updated = await backend.getGoal(initialGoal.id);
      onGoalUpdated(updated as Goal);
      toast.success("Goal saved");
    } catch (e) {
      toast.error("Failed to save goal");
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const chartData =
    simResult?.yearlyData.map((yd) => ({
      year: yd.year,
      "5th (Worst)": Math.round(yd.p5),
      "50th (Median)": Math.round(yd.p50),
      "75th": Math.round(yd.p75),
      "96th (Best)": Math.round(yd.p96),
      target: Math.round(target),
    })) ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-3 no-print shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/15"
            onClick={onBack}
            data-ocid="goal_detail.back_button"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-primary-foreground/70 text-xs">{client.name}</p>
            <h2 className="font-display font-bold text-lg truncate">
              {form.name || "Goal"}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/15 shrink-0"
            onClick={handleSave}
            disabled={saving}
            data-ocid="goal_detail.save_button"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span className="ml-1.5 text-sm">Save</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {/* ── Input Panel ── */}
        <div className="bg-card border-b border-border">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground"
            onClick={() => setInputExpanded((p) => !p)}
          >
            <span className="font-display font-semibold">Goal Parameters</span>
            {inputExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {inputExpanded && (
            <div className="px-4 pb-4 space-y-4 animate-slide-up">
              <div className="space-y-1.5">
                <Label>Goal Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => f("name")(e.target.value)}
                  data-ocid="goal_detail.name_input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Present Value (₹)</Label>
                  <NumInput
                    value={form.presentValue}
                    onChange={f("presentValue")}
                    prefix="₹"
                    data-ocid="goal_detail.present_value_input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Inflation (%)</Label>
                  <NumInput
                    value={form.inflationRate}
                    onChange={f("inflationRate")}
                    suffix="%"
                    data-ocid="goal_detail.inflation_rate_input"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Time Horizon (years)</Label>
                <NumInput
                  value={form.timeHorizon}
                  onChange={f("timeHorizon")}
                  suffix="yrs"
                  data-ocid="goal_detail.time_horizon_input"
                />
              </div>

              {/* Target corpus display */}
              {target > 0 && (
                <div className="rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 p-4">
                  <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                    Target Corpus (Inflation-Adjusted)
                  </p>
                  <p className="font-display text-3xl font-black text-primary mt-1">
                    {formatInr(target, true)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {formatInr(target)}
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Investment Strategy</Label>
                <Select value={form.strategy} onValueChange={setStrategy}>
                  <SelectTrigger data-ocid="goal_detail.strategy_select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(STRATEGIES).map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Expected Return (%)</Label>
                  <NumInput
                    value={form.strategyMean}
                    onChange={f("strategyMean")}
                    suffix="%"
                    data-ocid="goal_detail.mean_input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Std Deviation (%)</Label>
                  <NumInput
                    value={form.strategySD}
                    onChange={f("strategySD")}
                    suffix="%"
                    data-ocid="goal_detail.sd_input"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Lump Sum (₹)</Label>
                <NumInput
                  value={form.lumpSum}
                  onChange={f("lumpSum")}
                  prefix="₹"
                  data-ocid="goal_detail.lump_sum_input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Monthly SIP (₹)</Label>
                  <NumInput
                    value={form.monthlySIP}
                    onChange={f("monthlySIP")}
                    prefix="₹"
                    data-ocid="goal_detail.monthly_sip_input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Step-Up (%/yr)</Label>
                  <NumInput
                    value={form.monthlySIPStepUp}
                    onChange={f("monthlySIPStepUp")}
                    suffix="%"
                    data-ocid="goal_detail.monthly_stepup_input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Annual SIP (₹)</Label>
                  <NumInput
                    value={form.annualSIP}
                    onChange={f("annualSIP")}
                    prefix="₹"
                    data-ocid="goal_detail.annual_sip_input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Step-Up (%/yr)</Label>
                  <NumInput
                    value={form.annualSIPStepUp}
                    onChange={f("annualSIPStepUp")}
                    suffix="%"
                    data-ocid="goal_detail.annual_stepup_input"
                  />
                </div>
              </div>

              {/* Sim count toggle */}
              <div className="space-y-1.5">
                <Label>Simulation Paths</Label>
                <div
                  className="flex rounded-lg border border-border overflow-hidden"
                  data-ocid="goal_detail.sim_count_toggle"
                >
                  {["1000", "10000"].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${
                        form.simCount === n
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground hover:bg-muted"
                      }`}
                      onClick={() => f("simCount")(n)}
                    >
                      {n === "1000" ? "1,000" : "10,000"}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                className="w-full h-11 font-display font-semibold text-base"
                onClick={runSim}
                disabled={simRunning}
                data-ocid="goal_detail.run_simulation_button"
              >
                {simRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Running{" "}
                    {form.simCount} simulations...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" /> Run Monte Carlo Simulation
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* ── Simulation Results ── */}
        {simRunning && (
          <div
            className="flex flex-col items-center justify-center py-16 space-y-3"
            data-ocid="simulation.loading_state"
          >
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Running {form.simCount} simulations...
            </p>
            <p className="text-xs text-muted-foreground">
              This may take a few seconds
            </p>
          </div>
        )}

        {simResult && !simRunning && (
          <div className="px-4 py-5 space-y-6 animate-fade-in">
            {/* Success Rate */}
            <div className="space-y-2">
              <h3 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground">
                Simulation Success Rate
              </h3>
              <div
                className={`rounded-2xl border-2 p-5 text-center ${getSuccessBg(simResult.successRate)}`}
                data-ocid="simulation.success_rate"
              >
                <p className="text-5xl font-black font-display">
                  {simResult.successRate.toFixed(1)}%
                </p>
                <p className="text-sm font-medium mt-1 opacity-80">
                  of {form.simCount} paths reached the target corpus
                </p>
              </div>
            </div>

            {/* Percentile Cards */}
            <div className="space-y-2">
              <h3 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground">
                Final Corpus by Percentile
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                <PercentileCard
                  label="5th (Worst)"
                  value={simResult.p5Final}
                  target={target}
                  dataOcid="simulation.p5_card"
                />
                <PercentileCard
                  label="50th (Median)"
                  value={simResult.p50Final}
                  target={target}
                  highlight
                  dataOcid="simulation.p50_card"
                />
                <PercentileCard
                  label="75th"
                  value={simResult.p75Final}
                  target={target}
                  dataOcid="simulation.p75_card"
                />
                <PercentileCard
                  label="96th (Best)"
                  value={simResult.p96Final}
                  target={target}
                  dataOcid="simulation.p96_card"
                />
              </div>
            </div>

            {/* Goal Assessment */}
            <div className="space-y-2">
              <h3 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground">
                Goal Assessment
              </h3>
              <div className="space-y-2">
                {[
                  {
                    label: "50% Confidence",
                    value: simResult.p50Final,
                    pct: "50th",
                  },
                  {
                    label: "75% Confidence",
                    value: simResult.p75Final,
                    pct: "75th",
                  },
                  {
                    label: "96% Confidence",
                    value: simResult.p96Final,
                    pct: "96th",
                  },
                ].map(({ label, value, pct }) => {
                  const met = value >= target;
                  return (
                    <div
                      key={pct}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                        met
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-red-200 bg-red-50"
                      }`}
                    >
                      {met ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-semibold ${met ? "text-emerald-800" : "text-red-700"}`}
                        >
                          {met
                            ? `Goal Achievable at ${label}`
                            : `Goal NOT Met at ${label}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatInr(value, true)} vs target{" "}
                          {formatInr(target, true)}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {simResult.p50Final < target && (
                  <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">
                        Action Required
                      </p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Consider increasing your SIP amount or step-up
                        percentage to meet your goal with greater confidence.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Chart */}
            <div className="space-y-2">
              <h3 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground">
                Corpus Growth Projection
              </h3>
              <div className="rounded-2xl border border-border bg-card p-3">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="g96" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="#4f46e5"
                          stopOpacity={0.15}
                        />
                        <stop
                          offset="95%"
                          stopColor="#4f46e5"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient id="g75" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="#059669"
                          stopOpacity={0.15}
                        />
                        <stop
                          offset="95%"
                          stopColor="#059669"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient id="g50" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="#d97706"
                          stopOpacity={0.15}
                        />
                        <stop
                          offset="95%"
                          stopColor="#d97706"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient id="g5" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="#dc2626"
                          stopOpacity={0.1}
                        />
                        <stop
                          offset="95%"
                          stopColor="#dc2626"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="oklch(0.88 0.018 255)"
                      strokeOpacity={0.5}
                    />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 11, fill: "oklch(0.52 0.04 258)" }}
                      label={{
                        value: "Year",
                        position: "insideBottom",
                        offset: -2,
                        fontSize: 11,
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "oklch(0.52 0.04 258)" }}
                      tickFormatter={(v) => formatInr(v, true).replace("₹", "")}
                      width={52}
                    />
                    <RechartsTooltip content={<ChartTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="96th (Best)"
                      stroke="#4f46e5"
                      fill="url(#g96)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="75th"
                      stroke="#059669"
                      fill="url(#g75)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="50th (Median)"
                      stroke="#d97706"
                      fill="url(#g50)"
                      strokeWidth={2.5}
                      dot={false}
                      strokeDasharray="0"
                    />
                    <Area
                      type="monotone"
                      dataKey="5th (Worst)"
                      stroke="#dc2626"
                      fill="url(#g5)"
                      strokeWidth={1.5}
                      dot={false}
                      strokeDasharray="4 3"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Annual SIP Table */}
            <div className="space-y-2">
              <h3 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground">
                Annual SIP Projection Table
              </h3>
              <div className="table-scroll rounded-xl border border-border">
                <table className="w-full text-xs min-w-[560px]">
                  <thead>
                    <tr className="bg-primary text-primary-foreground">
                      <th className="px-3 py-2.5 text-left font-semibold">
                        Yr
                      </th>
                      <th className="px-3 py-2.5 text-right font-semibold">
                        Annual SIP
                      </th>
                      <th className="px-3 py-2.5 text-right font-semibold">
                        Monthly
                      </th>
                      <th className="px-3 py-2.5 text-right font-semibold">
                        5th %ile
                      </th>
                      <th className="px-3 py-2.5 text-right font-semibold">
                        50th %ile
                      </th>
                      <th className="px-3 py-2.5 text-right font-semibold">
                        75th %ile
                      </th>
                      <th className="px-3 py-2.5 text-right font-semibold">
                        96th %ile
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {simResult.yearlyData.map((yd, i) => {
                      const rowMet = yd.p50 >= target;
                      return (
                        <tr
                          key={yd.year}
                          className={`border-t border-border ${
                            i % 2 === 0 ? "bg-background" : "bg-muted/30"
                          } ${rowMet ? "" : "opacity-90"}`}
                        >
                          <td className="px-3 py-2 font-bold text-primary">
                            {yd.year}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatInr(yd.annualSIPAmount, true)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatInr(yd.monthlySIPAmount, true)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-red-600">
                            {formatInr(yd.p5, true)}
                          </td>
                          <td
                            className={`px-3 py-2 text-right tabular-nums font-medium ${yd.p50 >= target ? "text-emerald-700" : "text-amber-700"}`}
                          >
                            {formatInr(yd.p50, true)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-emerald-600">
                            {formatInr(yd.p75, true)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-indigo-600">
                            {formatInr(yd.p96, true)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Target: {formatInr(target, true)} · {form.simCount} simulations
                · {form.strategy} strategy
              </p>
            </div>
          </div>
        )}

        {/* No results yet */}
        {!simResult && !simRunning && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-primary" />
            </div>
            <p className="font-display font-semibold text-foreground">
              Ready to simulate
            </p>
            <p className="text-sm text-muted-foreground">
              Configure your goal parameters above and tap "Run Monte Carlo
              Simulation"
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Combined Goals Report Row ─────────────────────────────────────────────────

interface CombinedGoalRow {
  goal: Goal;
  target: number;
  result: SimulationResult | null;
  running: boolean;
}

// ─── Report Screen ─────────────────────────────────────────────────────────────

function ReportScreen({
  client,
  goals,
  initialGoalId,
}: {
  client: Client | null;
  goals: Goal[];
  initialGoalId: bigint | null;
}) {
  type ReportMode = "single" | "all";
  const [reportMode, setReportMode] = useState<ReportMode>("single");
  const [selectedGoalId, setSelectedGoalId] = useState<bigint | null>(
    initialGoalId ?? (goals.length > 0 ? goals[0].id : null),
  );
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [simRunning, setSimRunning] = useState(false);

  // Combined mode state
  const [combinedRows, setCombinedRows] = useState<CombinedGoalRow[]>([]);
  const [combinedRunning, setCombinedRunning] = useState(false);

  // When goals list or initial changes, update selected if none selected
  useEffect(() => {
    if (!selectedGoalId && goals.length > 0) {
      setSelectedGoalId(goals[0].id);
    }
  }, [goals, selectedGoalId]);

  const goal = goals.find((g) => g.id === selectedGoalId) ?? goals[0] ?? null;

  const target = goal
    ? calcTargetCorpus(
        Number(goal.presentValue),
        goal.inflationRate,
        Number(goal.timeHorizon),
      )
    : 0;

  // biome-ignore lint/correctness/useExhaustiveDependencies: only re-run when goal id changes
  useEffect(() => {
    if (!goal) return;
    setSimRunning(true);
    setSimResult(null);
    const t = calcTargetCorpus(
      Number(goal.presentValue),
      goal.inflationRate,
      Number(goal.timeHorizon),
    );
    setTimeout(() => {
      try {
        const result = runMonteCarlo({
          presentValue: t,
          timeHorizon: Number(goal.timeHorizon),
          meanReturn: goal.strategyMean / 100,
          sdReturn: goal.strategySD / 100,
          lumpSum: Number(goal.lumpSum),
          monthlySIP: Number(goal.monthlySIP),
          monthlySIPStepUp: goal.monthlySIPStepUp,
          annualSIP: Number(goal.annualSIP),
          annualSIPStepUp: goal.annualSIPStepUp,
          simCount: Number(goal.simCount),
        });
        setSimResult(result);
      } catch (e) {
        console.error(e);
      } finally {
        setSimRunning(false);
      }
    }, 30);
  }, [goal?.id]);

  // Run combined simulations sequentially when switching to all-goals mode
  // biome-ignore lint/correctness/useExhaustiveDependencies: reportMode and goals.length are the intended deps
  useEffect(() => {
    if (reportMode !== "all" || goals.length === 0) return;

    setCombinedRunning(true);
    // Initialise all rows as running
    const initial: CombinedGoalRow[] = goals.map((g) => ({
      goal: g,
      target: calcTargetCorpus(
        Number(g.presentValue),
        g.inflationRate,
        Number(g.timeHorizon),
      ),
      result: null,
      running: true,
    }));
    setCombinedRows(initial);

    // Run each simulation sequentially via chained timeouts to avoid blocking
    let idx = 0;
    function runNext() {
      if (idx >= goals.length) {
        setCombinedRunning(false);
        return;
      }
      const g = goals[idx];
      const t = calcTargetCorpus(
        Number(g.presentValue),
        g.inflationRate,
        Number(g.timeHorizon),
      );
      setTimeout(() => {
        let result: SimulationResult | null = null;
        try {
          result = runMonteCarlo({
            presentValue: t,
            timeHorizon: Number(g.timeHorizon),
            meanReturn: g.strategyMean / 100,
            sdReturn: g.strategySD / 100,
            lumpSum: Number(g.lumpSum),
            monthlySIP: Number(g.monthlySIP),
            monthlySIPStepUp: g.monthlySIPStepUp,
            annualSIP: Number(g.annualSIP),
            annualSIPStepUp: g.annualSIPStepUp,
            simCount: Number(g.simCount),
          });
        } catch (e) {
          console.error(e);
        }
        const capturedIdx = idx;
        setCombinedRows((prev) =>
          prev.map((row, i) =>
            i === capturedIdx ? { ...row, result, running: false } : row,
          ),
        );
        idx++;
        runNext();
      }, 30);
    }
    runNext();
  }, [reportMode, goals]);

  if (!client || goals.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <header className="bg-primary text-primary-foreground px-4 py-4">
          <h1 className="font-display text-xl font-bold">Report</h1>
        </header>
        <div
          className="flex-1 flex flex-col items-center justify-center px-6 space-y-4"
          data-ocid="report.empty_state"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="font-display font-semibold">No report available</p>
            <p className="text-muted-foreground text-sm mt-1">
              Select a client and open a goal to generate a report
            </p>
          </div>
        </div>
      </div>
    );
  }

  const onTrackCount = combinedRows.filter(
    (r) => r.result && r.result.p50Final >= r.target,
  ).length;

  return (
    <div className="flex flex-col h-full">
      {/* Report Header (screen only) */}
      <header className="bg-primary text-primary-foreground px-4 py-4 no-print shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-bold">
              Financial Goal Report
            </h1>
            <p className="text-primary-foreground/70 text-sm truncate">
              {client.name}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="bg-white/15 hover:bg-white/25 text-white border-white/20 shrink-0"
            onClick={() => window.print()}
            data-ocid="report.print_button"
          >
            <Printer className="w-4 h-4 mr-1.5" /> Print PDF
          </Button>
        </div>

        {/* Mode toggle */}
        <div
          className="mt-3 flex rounded-lg border border-white/20 overflow-hidden"
          data-ocid="report.mode_toggle"
        >
          <button
            type="button"
            className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${
              reportMode === "single"
                ? "bg-white text-primary"
                : "text-white/80 hover:bg-white/15"
            }`}
            onClick={() => setReportMode("single")}
            data-ocid="report.single_goal_tab"
          >
            Single Goal
          </button>
          <button
            type="button"
            className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${
              reportMode === "all"
                ? "bg-white text-primary"
                : "text-white/80 hover:bg-white/15"
            }`}
            onClick={() => setReportMode("all")}
            data-ocid="report.all_goals_tab"
          >
            All Goals ({goals.length})
          </button>
        </div>

        {/* Goal selector — only in single mode */}
        {reportMode === "single" && goals.length > 1 && (
          <div className="mt-2">
            <Select
              value={String(selectedGoalId)}
              onValueChange={(v) => setSelectedGoalId(BigInt(v))}
            >
              <SelectTrigger
                className="bg-white/15 border-white/20 text-white [&>svg]:text-white/70 h-8 text-sm"
                data-ocid="report.goal_select"
              >
                <SelectValue placeholder="Select goal..." />
              </SelectTrigger>
              <SelectContent>
                {goals.map((g) => (
                  <SelectItem key={String(g.id)} value={String(g.id)}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {reportMode === "single" && goals.length === 1 && goal && (
          <p className="text-primary-foreground/60 text-xs mt-1">{goal.name}</p>
        )}
      </header>

      <main className="flex-1 overflow-y-auto">
        {/* ── All Goals Mode ── */}
        {reportMode === "all" && (
          <div className="print-container px-4 py-6 space-y-6 max-w-3xl mx-auto">
            {/* Print title */}
            <div className="hidden print:block text-center pb-4 border-b-2 border-gray-800 mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                All Goals Summary Report
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Prepared for {client.name} ·{" "}
                {new Date().toLocaleDateString("en-IN")}
              </p>
            </div>

            {/* Client info */}
            <section>
              <h2 className="font-display font-bold text-base text-foreground mb-2 pb-1.5 border-b border-border">
                Client: {client.name}
              </h2>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                <span>
                  Age:{" "}
                  <strong className="text-foreground">
                    {Number(client.age)} yrs
                  </strong>
                </span>
                <span>
                  Sex: <strong className="text-foreground">{client.sex}</strong>
                </span>
                {client.occupation && (
                  <span>
                    Occupation:{" "}
                    <strong className="text-foreground">
                      {client.occupation}
                    </strong>
                  </span>
                )}
                {client.income && (
                  <span>
                    Income:{" "}
                    <strong className="text-foreground">
                      {formatInr(Number(client.income), true)}/yr
                    </strong>
                  </span>
                )}
              </div>
            </section>

            {/* Loading spinner */}
            {combinedRunning && (
              <div
                className="flex flex-col items-center justify-center py-12 space-y-3"
                data-ocid="report.combined_loading_state"
              >
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Running simulations for {goals.length} goals...
                </p>
                <p className="text-xs text-muted-foreground">
                  {combinedRows.filter((r) => !r.running).length} of{" "}
                  {goals.length} complete
                </p>
              </div>
            )}

            {/* Combined summary table */}
            {combinedRows.length > 0 && (
              <section>
                <h2 className="font-display font-bold text-base text-foreground mb-3 pb-1.5 border-b border-border">
                  Goals Summary — Monte Carlo Analysis
                </h2>
                <div
                  className="table-scroll rounded-xl border border-border"
                  data-ocid="report.combined_table"
                >
                  <table className="w-full text-xs min-w-[640px]">
                    <thead>
                      <tr className="bg-primary text-primary-foreground">
                        <th className="px-3 py-2.5 text-left font-semibold">
                          Goal
                        </th>
                        <th className="px-3 py-2.5 text-right font-semibold">
                          Present Value
                        </th>
                        <th className="px-3 py-2.5 text-right font-semibold">
                          Target Corpus
                        </th>
                        <th className="px-3 py-2.5 text-right font-semibold">
                          Horizon
                        </th>
                        <th className="px-3 py-2.5 text-center font-semibold">
                          Strategy
                        </th>
                        <th className="px-3 py-2.5 text-right font-semibold">
                          Monthly SIP
                        </th>
                        <th className="px-3 py-2.5 text-right font-semibold">
                          Success %
                        </th>
                        <th className="px-3 py-2.5 text-right font-semibold">
                          Median (50th)
                        </th>
                        <th className="px-3 py-2.5 text-center font-semibold">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {combinedRows.map((row, i) => {
                        const { goal: g, target: t, result, running } = row;
                        const monthlySIP = Number(g.monthlySIP);
                        const onTrack = result ? result.p50Final >= t : false;
                        return (
                          <tr
                            key={String(g.id)}
                            className={`border-t border-border ${i % 2 === 0 ? "bg-background" : "bg-muted/30"}`}
                            data-ocid={`report.combined_table.row.${i + 1}`}
                          >
                            <td className="px-3 py-2.5 font-semibold text-foreground max-w-[120px]">
                              <span className="block truncate">{g.name}</span>
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                              {formatInr(Number(g.presentValue), true)}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums font-medium text-primary">
                              {formatInr(t, true)}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums">
                              {Number(g.timeHorizon)} yr
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className="inline-block px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-medium text-[10px]">
                                {g.strategy}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums">
                              {monthlySIP > 0
                                ? formatInr(monthlySIP, true)
                                : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums">
                              {running ? (
                                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground inline" />
                              ) : result ? (
                                <span
                                  className={`font-semibold ${
                                    result.successRate >= 75
                                      ? "text-emerald-700"
                                      : result.successRate >= 50
                                        ? "text-amber-600"
                                        : "text-red-600"
                                  }`}
                                >
                                  {result.successRate.toFixed(1)}%
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums">
                              {running ? (
                                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground inline" />
                              ) : result ? (
                                <span
                                  className={`font-semibold ${
                                    result.p50Final >= t
                                      ? "text-emerald-700"
                                      : "text-amber-600"
                                  }`}
                                >
                                  {formatInr(result.p50Final, true)}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {running ? (
                                <span className="text-muted-foreground text-[10px]">
                                  Simulating...
                                </span>
                              ) : result ? (
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                    onTrack
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {onTrack ? (
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                  ) : (
                                    <AlertCircle className="w-2.5 h-2.5" />
                                  )}
                                  {onTrack ? "On Track" : "Needs Review"}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Summary line */}
                {!combinedRunning && combinedRows.every((r) => !r.running) && (
                  <div className="mt-3 flex items-center gap-2">
                    <div
                      className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium ${
                        onTrackCount === goals.length
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : onTrackCount >= goals.length / 2
                            ? "border-amber-200 bg-amber-50 text-amber-800"
                            : "border-red-200 bg-red-50 text-red-700"
                      }`}
                    >
                      {onTrackCount === goals.length ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                      )}
                      <span>
                        <strong>
                          {onTrackCount} of {goals.length}
                        </strong>{" "}
                        goals on track at 50th percentile
                        {onTrackCount < goals.length &&
                          " — review flagged goals to improve outcomes"}
                      </span>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Footer */}
            <footer className="pt-4 border-t border-border text-center">
              <p className="text-xs text-muted-foreground">
                © {new Date().getFullYear()}.{" "}
                <a
                  href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
                  className="hover:text-primary transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Built with ♥ using caffeine.ai
                </a>
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                This report is for educational/study purposes only. Past
                performance is not indicative of future results.
              </p>
            </footer>
          </div>
        )}

        {/* ── Single Goal Mode ── */}
        {reportMode === "single" &&
          (simRunning ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="print-container px-4 py-6 space-y-6 max-w-2xl mx-auto">
              {/* Print title */}
              <div className="hidden print:block text-center pb-4 border-b-2 border-gray-800 mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                  Financial Goal Planning Report
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Prepared for {client.name} ·{" "}
                  {new Date().toLocaleDateString("en-IN")}
                </p>
              </div>

              {/* 1. Client Details */}
              <section>
                <h2 className="font-display font-bold text-base text-foreground mb-3 pb-1.5 border-b border-border">
                  1. Client Details
                </h2>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name</span>
                    <p className="font-semibold">{client.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Age</span>
                    <p className="font-semibold">{Number(client.age)} years</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sex</span>
                    <p className="font-semibold">{client.sex}</p>
                  </div>
                  {client.occupation && (
                    <div>
                      <span className="text-muted-foreground">Occupation</span>
                      <p className="font-semibold">{client.occupation}</p>
                    </div>
                  )}
                  {client.income && (
                    <div>
                      <span className="text-muted-foreground">
                        Annual Income
                      </span>
                      <p className="font-semibold">
                        {formatInr(Number(client.income))}
                      </p>
                    </div>
                  )}
                  {client.email && (
                    <div>
                      <span className="text-muted-foreground">Email</span>
                      <p className="font-semibold">{client.email}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* 2. Goal Summary */}
              <section>
                <h2 className="font-display font-bold text-base text-foreground mb-3 pb-1.5 border-b border-border">
                  2. Goal Summary
                </h2>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Goal Name</span>
                    <p className="font-semibold">{goal.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Present Value</span>
                    <p className="font-semibold">
                      {formatInr(Number(goal.presentValue))}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Inflation Rate
                    </span>
                    <p className="font-semibold">{goal.inflationRate}%</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Time Horizon</span>
                    <p className="font-semibold">
                      {Number(goal.timeHorizon)} years
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">
                      Target Corpus (Inflation-Adjusted)
                    </span>
                    <p className="font-display font-black text-xl text-primary">
                      {formatInr(target, true)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatInr(target)}
                    </p>
                  </div>
                </div>
              </section>

              {/* 3. Investment Strategy */}
              <section>
                <h2 className="font-display font-bold text-base text-foreground mb-3 pb-1.5 border-b border-border">
                  3. Investment Strategy
                </h2>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Strategy</span>
                    <p className="font-semibold">{goal.strategy}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Expected Return
                    </span>
                    <p className="font-semibold">
                      {goal.strategyMean}% per annum
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Std Deviation</span>
                    <p className="font-semibold">{goal.strategySD}%</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lump Sum</span>
                    <p className="font-semibold">
                      {formatInr(Number(goal.lumpSum))}
                    </p>
                  </div>
                </div>
              </section>

              {/* 4. SIP Details */}
              <section>
                <h2 className="font-display font-bold text-base text-foreground mb-3 pb-1.5 border-b border-border">
                  4. SIP Details
                </h2>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Monthly SIP</span>
                    <p className="font-semibold">
                      {formatInr(Number(goal.monthlySIP))}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Monthly Step-Up
                    </span>
                    <p className="font-semibold">
                      {goal.monthlySIPStepUp}% per year
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Annual SIP</span>
                    <p className="font-semibold">
                      {formatInr(Number(goal.annualSIP))}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Annual Step-Up
                    </span>
                    <p className="font-semibold">
                      {goal.annualSIPStepUp}% per year
                    </p>
                  </div>
                </div>
              </section>

              {/* 5. Goal Assessment Summary */}
              {simResult && (
                <section>
                  <h2 className="font-display font-bold text-base text-foreground mb-3 pb-1.5 border-b border-border">
                    5. Goal Assessment Summary
                  </h2>

                  <div
                    className={`rounded-xl border-2 p-4 mb-4 text-center ${getSuccessBg(simResult.successRate)}`}
                  >
                    <p className="text-sm font-medium opacity-80">
                      Monte Carlo Success Rate
                    </p>
                    <p className="text-4xl font-black font-display mt-1">
                      {simResult.successRate.toFixed(1)}%
                    </p>
                    <p className="text-xs opacity-70 mt-1">
                      {Number(goal.simCount).toLocaleString()} simulation paths
                    </p>
                  </div>

                  <div className="rounded-xl border border-border overflow-hidden mb-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-primary text-primary-foreground">
                          <th className="px-4 py-2.5 text-left font-semibold">
                            Percentile
                          </th>
                          <th className="px-4 py-2.5 text-right font-semibold">
                            Final Corpus
                          </th>
                          <th className="px-4 py-2.5 text-center font-semibold">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { pct: "5th (Worst)", value: simResult.p5Final },
                          { pct: "50th (Median)", value: simResult.p50Final },
                          { pct: "75th", value: simResult.p75Final },
                          { pct: "96th (Best)", value: simResult.p96Final },
                        ].map(({ pct, value }, i) => {
                          const met = value >= target;
                          return (
                            <tr
                              key={pct}
                              className={`border-t border-border ${i % 2 === 0 ? "" : "bg-muted/30"}`}
                            >
                              <td className="px-4 py-2.5 font-medium">{pct}</td>
                              <td className="px-4 py-2.5 text-right tabular-nums font-semibold">
                                {formatInr(value, true)}
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                {met ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-700 font-medium text-xs">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Met
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-red-600 font-medium text-xs">
                                    <XCircle className="w-3.5 h-3.5" /> Not Met
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-2 text-sm">
                    {[
                      { label: "50% Confidence", value: simResult.p50Final },
                      { label: "75% Confidence", value: simResult.p75Final },
                      { label: "96% Confidence", value: simResult.p96Final },
                    ].map(({ label, value }) => {
                      const met = value >= target;
                      return (
                        <div
                          key={label}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                            met
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-red-200 bg-red-50 text-red-700"
                          }`}
                        >
                          {met ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 shrink-0" />
                          )}
                          <span className="font-medium">
                            {met
                              ? `Goal Achievable at ${label}`
                              : `Goal NOT Met at ${label}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* 6. Annual SIP Projection */}
              {simResult && (
                <section>
                  <h2 className="font-display font-bold text-base text-foreground mb-3 pb-1.5 border-b border-border">
                    6. Annual SIP Projection
                  </h2>
                  <div className="table-scroll rounded-xl border border-border">
                    <table className="w-full text-xs min-w-[560px]">
                      <thead>
                        <tr className="bg-primary text-primary-foreground">
                          <th className="px-3 py-2.5 text-left font-semibold">
                            Year
                          </th>
                          <th className="px-3 py-2.5 text-right font-semibold">
                            Annual SIP
                          </th>
                          <th className="px-3 py-2.5 text-right font-semibold">
                            Monthly
                          </th>
                          <th className="px-3 py-2.5 text-right font-semibold">
                            5th %ile
                          </th>
                          <th className="px-3 py-2.5 text-right font-semibold">
                            50th %ile
                          </th>
                          <th className="px-3 py-2.5 text-right font-semibold">
                            75th %ile
                          </th>
                          <th className="px-3 py-2.5 text-right font-semibold">
                            96th %ile
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {simResult.yearlyData.map((yd, i) => (
                          <tr
                            key={yd.year}
                            className={`border-t border-border ${i % 2 === 0 ? "" : "bg-muted/30"}`}
                          >
                            <td className="px-3 py-2 font-bold text-primary">
                              {yd.year}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {formatInr(yd.annualSIPAmount, true)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {formatInr(yd.monthlySIPAmount, true)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-red-600">
                              {formatInr(yd.p5, true)}
                            </td>
                            <td
                              className={`px-3 py-2 text-right tabular-nums font-medium ${yd.p50 >= target ? "text-emerald-700" : "text-amber-700"}`}
                            >
                              {formatInr(yd.p50, true)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-emerald-600">
                              {formatInr(yd.p75, true)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-indigo-600">
                              {formatInr(yd.p96, true)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Footer */}
              <footer className="pt-4 border-t border-border text-center">
                <p className="text-xs text-muted-foreground">
                  © {new Date().getFullYear()}.{" "}
                  <a
                    href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
                    className="hover:text-primary transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Built with ♥ using caffeine.ai
                  </a>
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  This report is for educational/study purposes only. Past
                  performance is not indicative of future results.
                </p>
              </footer>
            </div>
          ))}
      </main>
    </div>
  );
}

// ─── Bottom Nav ────────────────────────────────────────────────────────────────

function BottomNav({
  activeTab,
  setView,
  clientCount,
  goalCount,
}: {
  activeTab: View;
  setView: (v: View) => void;
  clientCount: number;
  goalCount: number;
}) {
  const tabs = [
    {
      id: "clients" as const,
      label: "Clients",
      icon: Users,
      count: clientCount,
      ocid: "nav.clients_tab",
    },
    {
      id: "goals" as const,
      label: "Goals",
      icon: Target,
      count: goalCount,
      ocid: "nav.goals_tab",
    },
    {
      id: "report" as const,
      label: "Report",
      icon: FileText,
      count: 0,
      ocid: "nav.report_tab",
    },
  ];

  return (
    <nav className="bg-card border-t border-border safe-bottom no-print shrink-0">
      <div className="flex">
        {tabs.map(({ id, label, icon: Icon, count, ocid }) => {
          const isActive =
            activeTab === id || (activeTab === "goal_detail" && id === "goals");
          return (
            <button
              key={id}
              type="button"
              className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 relative transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setView(id)}
              data-ocid={ocid}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-primary text-primary-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-medium ${isActive ? "text-primary" : ""}`}
              >
                {label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ─── Inner App (has actor) ─────────────────────────────────────────────────────

function InnerApp({ backend }: { backend: backendInterface }) {
  const [view, setView] = useState<View>("clients");
  const [clients, setClients] = useState<Client[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activeClientId, setActiveClientId] = useState<bigint | null>(null);
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);
  const [reportGoal, setReportGoal] = useState<Goal | null>(null);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingGoals, setLoadingGoals] = useState(false);

  // Client form
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Goal form
  const [goalFormOpen, setGoalFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Delete confirms
  const [deleteClientTarget, setDeleteClientTarget] = useState<Client | null>(
    null,
  );
  const [deleteGoalTarget, setDeleteGoalTarget] = useState<Goal | null>(null);

  const activeClient = clients.find((c) => c.id === activeClientId) ?? null;
  const clientGoals = goals.filter((g) => g.clientId === activeClientId);

  // Load clients on mount
  useEffect(() => {
    async function load() {
      try {
        const list = await backend.listClients();
        setClients(list as Client[]);
        if (list.length > 0) {
          setActiveClientId(list[0].id);
        }
      } catch (e) {
        toast.error("Failed to load clients");
        console.error(e);
      } finally {
        setLoadingClients(false);
      }
    }
    load();
  }, [backend]);

  // Load goals when active client changes
  useEffect(() => {
    if (!activeClientId) {
      setGoals([]);
      return;
    }
    setLoadingGoals(true);
    backend
      .listGoalsByClient(activeClientId)
      .then((list) => setGoals(list as Goal[]))
      .catch((e) => {
        toast.error("Failed to load goals");
        console.error(e);
      })
      .finally(() => setLoadingGoals(false));
  }, [activeClientId, backend]);

  function handleSetActiveClient(id: bigint) {
    setActiveClientId(id);
    setActiveGoal(null);
    if (view === "goal_detail") setView("goals");
  }

  function handleOpenGoal(goal: Goal) {
    setActiveGoal(goal);
    setView("goal_detail");
  }

  function handleGoalBack() {
    setActiveGoal(null);
    setView("goals");
  }

  async function handleDeleteClient() {
    if (!deleteClientTarget) return;
    try {
      await backend.deleteClient(deleteClientTarget.id);
      const newClients = clients.filter((c) => c.id !== deleteClientTarget.id);
      setClients(newClients);
      if (activeClientId === deleteClientTarget.id) {
        setActiveClientId(newClients.length > 0 ? newClients[0].id : null);
        setActiveGoal(null);
        if (view === "goal_detail") setView("goals");
      }
      toast.success("Client deleted");
    } catch (e) {
      toast.error("Failed to delete client");
      console.error(e);
    } finally {
      setDeleteClientTarget(null);
    }
  }

  async function handleDeleteGoal() {
    if (!deleteGoalTarget) return;
    try {
      await backend.deleteGoal(deleteGoalTarget.id);
      setGoals((prev) => prev.filter((g) => g.id !== deleteGoalTarget.id));
      if (activeGoal?.id === deleteGoalTarget.id) {
        setActiveGoal(null);
        setView("goals");
      }
      toast.success("Goal deleted");
    } catch (e) {
      toast.error("Failed to delete goal");
      console.error(e);
    } finally {
      setDeleteGoalTarget(null);
    }
  }

  function handleClientSaved() {
    setLoadingClients(true);
    backend
      .listClients()
      .then((list) => {
        setClients(list as Client[]);
        if (!activeClientId && list.length > 0) {
          setActiveClientId(list[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingClients(false));
  }

  function handleGoalSaved(goal: Goal) {
    setGoals((prev) => {
      const idx = prev.findIndex((g) => g.id === goal.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = goal;
        return updated;
      }
      return [...prev, goal];
    });
  }

  function handleGoalUpdated(goal: Goal) {
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? goal : g)));
    setActiveGoal(goal);
  }

  function handleNavChange(v: View) {
    if (v === "goals" && view === "goal_detail") {
      setActiveGoal(null);
    }
    if (v === "report") {
      setReportGoal(activeGoal ?? null);
    }
    setView(v);
  }

  const reportInitialGoalId =
    reportGoal?.id ?? (clientGoals.length > 0 ? clientGoals[0].id : null);

  return (
    <div className="min-h-screen min-h-dvh bg-background flex items-start justify-center">
      {/* Mobile-first container */}
      <div className="w-full max-w-[480px] min-h-screen min-h-dvh flex flex-col md:shadow-2xl md:border-x md:border-border">
        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {view === "clients" && (
            <ClientsScreen
              clients={clients}
              activeClientId={activeClientId}
              setActiveClientId={handleSetActiveClient}
              onEdit={(c) => {
                setEditingClient(c);
                setClientFormOpen(true);
              }}
              onDelete={setDeleteClientTarget}
              onAdd={() => {
                setEditingClient(null);
                setClientFormOpen(true);
              }}
              loading={loadingClients}
            />
          )}

          {view === "goals" && (
            <GoalsScreen
              client={activeClient}
              goals={clientGoals}
              onAdd={() => {
                setEditingGoal(null);
                setGoalFormOpen(true);
              }}
              onEdit={(g) => {
                setEditingGoal(g);
                setGoalFormOpen(true);
              }}
              onDelete={setDeleteGoalTarget}
              onOpen={handleOpenGoal}
              loading={loadingGoals}
            />
          )}

          {view === "goal_detail" && activeGoal && activeClient && (
            <GoalDetailView
              goal={activeGoal}
              client={activeClient}
              onBack={handleGoalBack}
              onGoalUpdated={handleGoalUpdated}
              backend={backend}
            />
          )}

          {view === "report" && (
            <ReportScreen
              client={activeClient}
              goals={clientGoals}
              initialGoalId={reportInitialGoalId}
            />
          )}
        </div>

        {/* Bottom Nav */}
        <BottomNav
          activeTab={view}
          setView={handleNavChange}
          clientCount={clients.length}
          goalCount={clientGoals.length}
        />
      </div>

      {/* Dialogs */}
      <ClientFormDialog
        open={clientFormOpen}
        onClose={() => {
          setClientFormOpen(false);
          setEditingClient(null);
        }}
        editClient={editingClient}
        onSaved={handleClientSaved}
        backend={backend}
      />

      <GoalFormDialog
        open={goalFormOpen}
        onClose={() => {
          setGoalFormOpen(false);
          setEditingGoal(null);
        }}
        editGoal={editingGoal}
        clientId={activeClientId}
        onSaved={handleGoalSaved}
        backend={backend}
      />

      {/* Delete Client Confirm */}
      <AlertDialog
        open={!!deleteClientTarget}
        onOpenChange={(o) => !o && setDeleteClientTarget(null)}
      >
        <AlertDialogContent data-ocid="clients.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>{deleteClientTarget?.name}</strong> and all their goals.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="clients.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteClient}
              data-ocid="clients.confirm_button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Goal Confirm */}
      <AlertDialog
        open={!!deleteGoalTarget}
        onOpenChange={(o) => !o && setDeleteGoalTarget(null)}
      >
        <AlertDialogContent data-ocid="goals.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>{deleteGoalTarget?.name}</strong>. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="goals.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteGoal}
              data-ocid="goals.confirm_button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster position="top-center" richColors />
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const { actor, isFetching } = useActor();

  if (isFetching || !actor) {
    return (
      <div className="min-h-screen min-h-dvh bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
            <IndianRupee className="w-7 h-7 text-primary-foreground" />
          </div>
          <div className="text-center">
            <p className="font-display font-bold text-lg text-foreground">
              CFP Goal Planner
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              Initializing...
            </p>
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return <InnerApp backend={actor} />;
}
