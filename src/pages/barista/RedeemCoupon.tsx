import { useState } from "react";
import { redeemCoupon } from "@/services/api";
import { toast } from "sonner";
import { 
  CheckCircle, 
  XCircle, 
  User, 
  Phone, 
  Calendar, 
  DollarSign, 
  Loader2, 
  Sparkles, 
  Clock, 
  History 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatPhoneDisplay } from "@/utils/phone";

interface RedemptionResult {
  status: "SUCCESS" | "FAILED" | "NOT_FOUND";
  message: string;
  coupon_code: string;
  is_redeemed: boolean;
  redeemed_at: string | null;
  expiry_date: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  total_visits: number | null;
  lifetime_spend: number | null;
}

export default function RedeemCoupon() {
  const [couponCode, setCouponCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RedemptionResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!couponCode.trim()) {
      toast.error("Required field", { description: "Please enter a coupon code." });
      return;
    }

    const normalizedCode = couponCode.trim().toUpperCase();
    setCouponCode(normalizedCode);
    setLoading(true);
    setResult(null);

    try {
      const response = await redeemCoupon({ coupon_code: normalizedCode });
      setResult(response);

      if (response.status === "SUCCESS") {
        toast.success("Coupon redeemed", { description: response.message });
      } else {
        toast.error("Redemption failed", { description: response.message });
      }
    } catch (error) {
      console.error("Error redeeming coupon:", error);
      toast.error("Failed to redeem coupon", {
        description: error instanceof Error ? error.message : "Network error. Please try again."
      });

      setResult({
        status: "FAILED",
        message: "❌ Network error. Please check your connection and try again.",
        coupon_code: normalizedCode,
        is_redeemed: false,
        redeemed_at: null,
        expiry_date: null,
        customer_id: null,
        customer_name: null,
        customer_phone: null,
        total_visits: null,
        lifetime_spend: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setCouponCode("");
    setResult(null);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-xl px-4 sm:px-0"
    >
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
        <div className="border-b border-slate-100 bg-gradient-to-br from-amber-50/40 via-white to-white px-7 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                Redeem Coupon
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Validate and apply customer reward discounts.
              </p>
            </div>
          </div>
        </div>

        <div className="px-7 py-7 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="code"
                className="text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                Coupon Code
              </Label>
              <div className="relative">
                <Input
                  id="code"
                  type="text"
                  placeholder="ENTER CODE"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="h-14 text-center font-mono text-lg tracking-[0.25em] uppercase focus-visible:ring-2 focus-visible:ring-amber-500/20"
                  maxLength={20}
                  required
                  disabled={loading}
                  autoFocus
                />
                {loading && (
                  <div className="absolute right-4 top-4.5">
                    <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Enter the coupon code exactly as it appears. Codes are case-insensitive.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={loading || !couponCode.trim()}
                className="flex-1 h-12 bg-slate-900 text-sm font-semibold text-white hover:bg-black rounded-xl transition-all shadow-sm disabled:opacity-50"
              >
                {loading ? "Validating..." : "Validate & Redeem"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                className="h-12 border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold px-6 rounded-xl"
                disabled={loading}
              >
                Clear
              </Button>
            </div>
          </form>

          {/* Results Alert Card */}
          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                initial={{ opacity: 0, height: 0, scale: 0.98 }}
                animate={{ opacity: 1, height: "auto", scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div
                  className={`rounded-xl border p-5 shadow-sm ${
                    result.status === "SUCCESS"
                      ? "border-green-100 bg-gradient-to-br from-green-50/70 to-emerald-50/40"
                      : "border-red-100 bg-gradient-to-br from-red-50/70 to-rose-50/40"
                  }`}
                >
                  {/* Status Header */}
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow-sm ${
                        result.status === "SUCCESS"
                          ? "bg-green-600 text-white"
                          : "bg-red-600 text-white"
                      }`}
                    >
                      {result.status === "SUCCESS" ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <XCircle className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3
                          className={`text-sm font-semibold ${
                            result.status === "SUCCESS" ? "text-green-900" : "text-red-900"
                          }`}
                        >
                          {result.status === "SUCCESS" ? "Coupon Redeemed" : "Redemption Failed"}
                        </h3>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                            result.is_redeemed
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {result.is_redeemed ? "Redeemed" : "Pending"}
                        </span>
                      </div>
                      <p
                        className={`text-xs mt-1 font-medium ${
                          result.status === "SUCCESS" ? "text-green-700" : "text-red-700"
                        }`}
                      >
                        {result.message}
                      </p>

                      {/* Coupon Metadata */}
                      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3.5 text-xs border-t border-slate-100 pt-3.5">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Code</p>
                          <p className="font-mono font-semibold text-slate-700 mt-0.5">{result.coupon_code}</p>
                        </div>
                        {result.redeemed_at && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Redeemed At</p>
                            <p className="font-semibold text-slate-700 mt-0.5">{formatDate(result.redeemed_at)}</p>
                          </div>
                        )}
                        {result.expiry_date && (
                          <div className="col-span-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Expiry Date</p>
                            <p
                              className={`font-semibold mt-0.5 ${
                                new Date(result.expiry_date) < new Date() && !result.is_redeemed
                                  ? "text-red-600 font-bold"
                                  : "text-slate-700"
                              }`}
                            >
                              {formatDate(result.expiry_date)}
                              {new Date(result.expiry_date) < new Date() && !result.is_redeemed && " (Expired)"}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Customer Details (Only on Success) */}
                      {result.status === "SUCCESS" && result.customer_id && (
                        <div className="mt-5 pt-4 border-t border-green-200/60">
                          <h4 className="text-xs font-bold text-green-900 flex items-center gap-1.5 mb-3 uppercase tracking-wider">
                            <User className="w-3.5 h-3.5 text-green-700/80" /> Customer Profile
                          </h4>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-3.5 text-xs">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Name</p>
                              <p className="font-semibold text-slate-800 mt-0.5">{result.customer_name || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone</p>
                              <p className="font-semibold text-slate-800 mt-0.5">
                                {result.customer_phone ? formatPhoneDisplay(result.customer_phone) : "N/A"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Visits</p>
                              <div className="flex items-center gap-1.5 text-slate-800 mt-0.5 font-semibold">
                                <History className="w-3.5 h-3.5 text-slate-400" />
                                {result.total_visits || 0}
                              </div>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lifetime Spend</p>
                              <div className="flex items-center gap-1 text-slate-800 mt-0.5 font-semibold">
                                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                                ₹{result.lifetime_spend?.toLocaleString() || 0}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* How It Works Info */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
            <h3 className="text-xs font-bold text-slate-700 mb-2.5 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400" /> Redemption Guidelines
            </h3>
            <ul className="text-xs text-slate-500 space-y-1.5">
              <li>• Enter the coupon code provided by the customer.</li>
              <li>• If valid, the discount will be applied and coupon marked as redeemed.</li>
              <li>• Verification displays the matching customer profile details.</li>
              <li>• Invalid, expired, or already-redeemed coupons will be rejected automatically.</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
