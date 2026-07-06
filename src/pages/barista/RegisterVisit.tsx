import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { checkCustomerByPhone, registerVisit } from "@/services/api";
import { toast } from "sonner";
import { normalizePhone, formatPhoneDisplay } from "@/utils/phone";
import { 
  User, 
  Phone, 
  Cake, 
  Sparkles, 
  Loader2, 
  Check, 
  UserPlus,
  TrendingUp,
  History
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface CustomerData {
  customer_id: string;
  name: string;
  phone: string;
  birthday: string;
  total_visits: number;
  lifetime_spend: number;
  last_visit: string;
  member_since: string;
}

const COUNTRY_CODES = ["+91", "+1", "+44", "+61", "+49", "+33", "+81"];

export default function RegisterVisit() {
  const { user } = useAuth();
  
  // Form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("+91");
  const [birthday, setBirthday] = useState("");
  const [amountSpent, setAmountSpent] = useState("");
  
  // Loading & state management
  const [loading, setLoading] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [showExistingCustomer, setShowExistingCustomer] = useState(false);
  const [showNewCustomerConfirm, setShowNewCustomerConfirm] = useState(false);
  
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Debounced phone lookup (wait for 500ms of inactivity)
  useEffect(() => {
    if (!phone || phone.trim().length < 10) {
      setCustomerData(null);
      setShowExistingCustomer(false);
      setShowNewCustomerConfirm(false);
      return;
    }

    const timer = setTimeout(() => {
      handleCheckCustomer();
    }, 500);

    return () => clearTimeout(timer);
  }, [phone, country]);

  const handleCheckCustomer = async () => {
    const fullPhone = `${country}${phone.trim()}`;
    setCheckingPhone(true);
    try {
      const result = await checkCustomerByPhone(fullPhone);

      if (result.found && result.customer) {
        setCustomerData(result.customer as unknown as CustomerData);
        setShowExistingCustomer(true);
        setShowNewCustomerConfirm(false);
      } else {
        setCustomerData(null);
        setShowExistingCustomer(false);
        setShowNewCustomerConfirm(true);
      }
    } catch (error) {
      console.error("Error checking customer:", error);
    } finally {
      setCheckingPhone(false);
    }
  };

  const handlePreFillForm = () => {
    if (customerData) {
      setName(customerData.name || "");
      setBirthday(customerData.birthday ? customerData.birthday.split("T")[0] : "");
      setShowExistingCustomer(false);
      setShowNewCustomerConfirm(false);
      toast.success("Details pre-filled", {
        description: `Loaded profile for ${customerData.name}`
      });
      // Focus on amount field after react state updates
      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 50);
    }
  };

  const handleContinueAsNew = () => {
    setShowExistingCustomer(false);
    setShowNewCustomerConfirm(false);
    setCustomerData(null);
    setName("");
    setBirthday("");
    setAmountSpent("");
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 50);
  };

  const handleConfirmNewCustomer = () => {
    setShowNewCustomerConfirm(false);
    setName("");
    setBirthday("");
    setAmountSpent("");
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 50);
  };

  const handleCancelNewCustomer = () => {
    setShowNewCustomerConfirm(false);
    setPhone("");
    setShowExistingCustomer(false);
    phoneInputRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Required field", { description: "Please enter customer name." });
      return;
    }
    if (!phone.trim() || phone.length < 10) {
      toast.error("Required field", { description: "Please enter a valid phone number." });
      return;
    }
    if (!amountSpent || parseFloat(amountSpent) <= 0) {
      toast.error("Required field", { description: "Please enter a valid amount spent." });
      return;
    }

    setLoading(true);
    try {
      const fullPhone = `${country}${phone.trim()}`;
      const result = await registerVisit({
        customer_id: customerData?.customer_id || undefined,
        name: name.trim(),
        phone: fullPhone,
        birthday: birthday || "",
        amount_spent: parseFloat(amountSpent),
      });

      toast.success("Visit registered", {
        description: `${name} · ₹${parseFloat(amountSpent).toLocaleString()} logged successfully!`
      });

      // Reset form
      setName("");
      setPhone("");
      setBirthday("");
      setAmountSpent("");
      setCustomerData(null);
      setShowExistingCustomer(false);
      setShowNewCustomerConfirm(false);
      
      // Refocus on phone input
      setTimeout(() => {
        phoneInputRef.current?.focus();
      }, 50);

    } catch (error) {
      console.error("Error logging visit:", error);
      toast.error("Failed to log visit", {
        description: error instanceof Error ? error.message : "An unexpected error occurred."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-2xl px-4 sm:px-0"
    >
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
        <div className="border-b border-slate-100 bg-gradient-to-br from-amber-50/40 via-white to-white px-7 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                Register Customer Visit
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Log purchases, update visits and celebrate client loyalty.
              </p>
            </div>
          </div>
        </div>

        <div className="px-7 py-7 space-y-6">
          {/* Notifications / Summary Section */}
          <AnimatePresence mode="wait">
            {showExistingCustomer && customerData && (
              <motion.div
                initial={{ opacity: 0, height: 0, scale: 0.98 }}
                animate={{ opacity: 1, height: "auto", scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/70 to-indigo-50/40 p-5 shadow-sm">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-blue-900">
                          🧑 Returning Customer Identified
                        </h4>
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                          <Check className="h-3 w-3" /> Member
                        </span>
                      </div>
                      
                      <div className="mt-3.5 grid grid-cols-2 gap-x-6 gap-y-3.5 text-xs">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Name</p>
                          <p className="font-semibold text-slate-700 mt-0.5">{customerData.name}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone</p>
                          <p className="font-semibold text-slate-700 mt-0.5">{formatPhoneDisplay(customerData.phone)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Birthday</p>
                          <div className="flex items-center gap-1.5 text-slate-700 mt-0.5 font-semibold">
                            <Cake className="h-3.5 w-3.5 text-pink-500/70" />
                            {customerData.birthday || "Not configured"}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Visits & Spend</p>
                          <div className="flex items-center gap-3 text-slate-700 mt-0.5 font-semibold">
                            <span className="flex items-center gap-1">
                              <History className="h-3.5 w-3.5 text-blue-500/80" /> {customerData.total_visits}
                            </span>
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3.5 w-3.5 text-green-600/80" /> ₹{customerData.lifetime_spend.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2.5 mt-5">
                        <Button
                          onClick={handlePreFillForm}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs h-9 px-4 rounded-lg shadow-sm"
                        >
                          Pre-fill Form
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleContinueAsNew}
                          className="border-blue-200 text-blue-700 hover:bg-blue-50/50 font-medium text-xs h-9 px-4 rounded-lg"
                        >
                          Continue as New
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {showNewCustomerConfirm && (
              <motion.div
                initial={{ opacity: 0, height: 0, scale: 0.98 }}
                animate={{ opacity: 1, height: "auto", scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50/70 to-yellow-50/40 p-5 shadow-sm">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm">
                      <UserPlus className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-amber-900">
                        🆕 Is this a new customer?
                      </h4>
                      <p className="text-xs text-amber-700 mt-1">
                        No registered profile exists with the phone number: <strong className="font-semibold text-slate-800">{formatPhoneDisplay(country + phone)}</strong>. Would you like to create one?
                      </p>

                      <div className="flex gap-2.5 mt-4">
                        <Button
                          onClick={handleConfirmNewCustomer}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs h-9 px-4 rounded-lg shadow-sm"
                        >
                          Yes, New Customer
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleCancelNewCustomer}
                          className="border-amber-200 text-amber-700 hover:bg-amber-50/50 font-medium text-xs h-9 px-4 rounded-lg"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Phone input (trigger check) */}
            <div className="space-y-2">
              <Label
                htmlFor="phone"
                className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                Phone Number
              </Label>
              <div className="flex gap-2">
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="h-12 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/20"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <Input
                    ref={phoneInputRef}
                    id="phone"
                    type="tel"
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                    className="h-12 text-base focus-visible:ring-2 focus-visible:ring-amber-500/20"
                    required
                    disabled={loading}
                    autoFocus
                  />
                  {checkingPhone && (
                    <div className="absolute right-3.5 top-3.5">
                      <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Entering 10 digits triggers automatic smart customer search.
              </p>
            </div>

            {/* Name Input */}
            <div className="space-y-2">
              <Label
                htmlFor="customer_name"
                className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                <User className="h-3.5 w-3.5 text-slate-400" />
                Customer Name
              </Label>
              <Input
                ref={nameInputRef}
                id="customer_name"
                type="text"
                placeholder="Amelia Chen"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 text-base focus-visible:ring-2 focus-visible:ring-amber-500/20"
                required
                disabled={loading}
              />
            </div>

            {/* Grid for Birthday & Amount */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Birthday Input */}
              <div className="space-y-2">
                <Label
                  htmlFor="birthday"
                  className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  <Cake className="h-3.5 w-3.5 text-slate-400" />
                  Birthday
                </Label>
                <Input
                  id="birthday"
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="h-12 text-base focus-visible:ring-2 focus-visible:ring-amber-500/20"
                  disabled={loading}
                />
                <p className="text-[11px] text-slate-400">
                  Optional — helps celebration & milestones.
                </p>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <Label
                  htmlFor="amount_spent"
                  className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  <TrendingUp className="h-3.5 w-3.5 text-slate-400" />
                  Amount Spent
                </Label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-slate-400 font-medium">
                    ₹
                  </span>
                  <Input
                    ref={amountInputRef}
                    id="amount_spent"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amountSpent}
                    onChange={(e) => setAmountSpent(e.target.value.replace(/[^0-9.]/g, ""))}
                    className="h-12 pl-8 text-base tabular-nums focus-visible:ring-2 focus-visible:ring-amber-500/20"
                    required
                    disabled={loading}
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setName("");
                  setPhone("");
                  setBirthday("");
                  setAmountSpent("");
                  setCustomerData(null);
                  setShowExistingCustomer(false);
                  setShowNewCustomerConfirm(false);
                  phoneInputRef.current?.focus();
                }}
                className="text-xs font-semibold text-slate-400 transition-colors hover:text-slate-700"
                disabled={loading}
              >
                Clear Form
              </button>
              
              <Button
                type="submit"
                disabled={loading || !name.trim() || !phone.trim() || !amountSpent}
                className="h-12 min-w-[160px] bg-slate-900 text-sm font-semibold text-white hover:bg-black rounded-xl transition-all shadow-sm disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging…
                  </>
                ) : (
                  "Log Visit"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
