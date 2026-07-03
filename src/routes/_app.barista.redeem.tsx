import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { api } from "@/services/api";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/barista/redeem")({
  head: () => ({ meta: [{ title: "Redeem Coupon — Crema" }] }),
  component: RedeemCouponPage,
});

function RedeemCouponPage() {
  const { user } = useAuth();
  const [code, setCode] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.redeemCoupon({
        coupon_code: code.trim(),
      }),
  });

  const result = mutation.data;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-xl"
    >
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-gradient-to-br from-amber-50/60 to-white px-7 py-6">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            Redeem Coupon
          </h2>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim() && !mutation.isPending) mutation.mutate();
          }}
          className="space-y-5 px-7 py-7"
        >
          <div className="space-y-2">
            <Label
              htmlFor="code"
              className="text-xs font-medium uppercase tracking-wider text-slate-500"
            >
              Coupon Code
            </Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="CREMA-XXXX"
              autoFocus
              className="h-14 text-center font-mono text-lg tracking-[0.25em] uppercase focus-visible:ring-2 focus-visible:ring-amber-500/20"
            />
          </div>

          <Button
            type="submit"
            disabled={!code.trim() || mutation.isPending}
            className="h-12 w-full bg-[#1A1A1A] text-base font-medium text-white hover:bg-black"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Validating…
              </>
            ) : (
              "Validate & Redeem"
            )}
          </Button>

          {result && result.success ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              ✅ Coupon Valid — Discount Applied
            </div>
          ) : null}
          {result && !result.success ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
              ❌ Invalid or Expired Coupon
            </div>
          ) : null}
        </form>
      </div>
    </motion.div>
  );
}
