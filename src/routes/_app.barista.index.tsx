import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, User, Phone, Cake, DollarSign } from "lucide-react";
import { api } from "@/services/api";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/barista/")({
  head: () => ({ meta: [{ title: "Log Customer Visit — Crema" }] }),
  component: RegisterVisitPage,
});

const COUNTRY_CODES = ["+91", "+1", "+44", "+61", "+49", "+33", "+81"];

const empty = { name: "", country: "+91", phone: "", birthday: "", amount: "" };

function RegisterVisitPage() {
  const { user } = useAuth();
  const [form, setForm] = useState(empty);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      api.registerVisit({
        name: form.name.trim(),
        phone: `${form.country} ${form.phone.trim()}`,
        birthday: form.birthday,
        amount_spent: Number(form.amount) || 0,
      }),
    onSuccess: () => {
      toast.success("Visit logged", {
        description: `${form.name} · $${Number(form.amount).toFixed(2)} added.`,
      });
      setForm(empty);
      // Invalidate relevant queries to update dashboard, CRM, and analytics statistics
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: () => toast.error("Could not log visit"),
  });

  const disabled =
    mutation.isPending ||
    !form.name.trim() ||
    !form.phone.trim() ||
    !form.birthday ||
    !form.amount;

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-2xl"
    >
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-gradient-to-br from-amber-50/60 to-white px-7 py-6">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            Log Customer Visit
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Enter details and submit — Tab to fly through fields.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!disabled) mutation.mutate();
          }}
          className="space-y-6 px-7 py-7"
        >
          <Field id="name" label="Customer name" icon={<User className="h-4 w-4" />}>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Amelia Chen"
              className="h-12 text-base focus-visible:ring-2 focus-visible:ring-amber-500/20"
              autoFocus
            />
          </Field>

          <Field id="phone" label="Phone" icon={<Phone className="h-4 w-4" />}>
            <div className="flex gap-2">
              <select
                value={form.country}
                onChange={(e) => update("country", e.target.value)}
                className="h-12 rounded-md border border-input bg-white px-3 text-sm font-medium text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/20"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <Input
                id="phone"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="98765 43210"
                className="h-12 flex-1 text-base focus-visible:ring-2 focus-visible:ring-amber-500/20"
              />
            </div>
          </Field>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Field id="birthday" label="Birthday" icon={<Cake className="h-4 w-4" />}>
              <Input
                id="birthday"
                type="date"
                value={form.birthday}
                onChange={(e) => update("birthday", e.target.value)}
                className="h-12 text-base focus-visible:ring-2 focus-visible:ring-amber-500/20"
              />
            </Field>

            <Field id="amount" label="Amount spent" icon={<DollarSign className="h-4 w-4" />}>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">
                  $
                </span>
                <Input
                  id="amount"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => update("amount", e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="0.00"
                  className="h-12 pl-7 text-base tabular-nums focus-visible:ring-2 focus-visible:ring-amber-500/20"
                />
              </div>
            </Field>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setForm(empty)}
              className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-900"
            >
              Clear
            </button>
            <Button
              type="submit"
              disabled={disabled}
              className="h-12 min-w-[160px] bg-[#1A1A1A] text-base font-medium text-white hover:bg-black"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                "Log visit"
              )}
            </Button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

function Field({
  id,
  label,
  icon,
  children,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label
        htmlFor={id}
        className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500"
      >
        <span className="text-slate-400">{icon}</span>
        {label}
      </Label>
      {children}
    </div>
  );
}
