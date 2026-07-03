import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { motion } from "framer-motion";
import { Building2, Phone, MapPin, Lock, User, Sparkles, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const searchSchema = z.object({
  email: z.string(),
  name: z.string().catch(""),
  google_id: z.string(),
});

export const Route = createFileRoute("/complete-registration")({
  validateSearch: (search) => searchSchema.parse(search),
  component: CompleteRegistrationPage,
});

function CompleteRegistrationPage() {
  const { email, name, google_id } = Route.useSearch();
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [form, setForm] = useState({
    business_name: "",
    owner_name: name || "",
    phone: "",
    address: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.business_name.trim() || !form.owner_name.trim() || !form.phone.trim() || !form.address.trim()) {
      toast.error("Please fill in all details.");
      return;
    }
    if (form.password && form.password !== form.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.completeRegistration({
        email,
        name: form.owner_name,
        google_id,
        business_name: form.business_name,
        phone: form.phone,
        address: form.address,
        password: form.password || undefined,
      });

      setLoading(false);
      if (!res.success) {
        toast.error(res.message || "Failed to complete registration.");
        return;
      }

      // Log the owner in immediately
      setUser({
        email: res.email,
        role: res.role,
        tenant_id: res.tenant_id,
        name: res.name,
        business_name: res.business_name,
      });

      toast.success("Registration complete! Welcome to Crema.");
      navigate({ to: "/owner", replace: true });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen w-full grid-cols-1 bg-slate-50 lg:grid-cols-2">
      {/* Left panel */}
      <div className="relative hidden overflow-hidden bg-[#0F0F0F] lg:block">
        <div className="absolute inset-0">
          <div className="absolute -left-32 top-1/4 h-[480px] w-[480px] rounded-full bg-amber-500/20 blur-3xl" />
          <div className="absolute right-0 top-0 h-[420px] w-[420px] rounded-full bg-rose-500/10 blur-3xl" />
        </div>
        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-amber-400 backdrop-blur-md ring-1 ring-white/15">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">Crema</div>
              <div className="text-[11px] text-white/50">Workspace Setup</div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
          >
            <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight">
              One step away from activating your cafe.
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-white/60">
              Provide your business particulars and optionally set up a backup password to access your manager dashboard anytime.
            </p>
          </motion.div>

          <div className="text-[11px] text-white/40">
            © {new Date().getFullYear()} Crema Labs · Multi-Tenant Platform
          </div>
        </div>
      </div>

      {/* Right panel (Form) */}
      <div className="flex items-center justify-center px-6 py-12 sm:px-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md space-y-6"
        >
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Complete Onboarding</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Tell us about your cafe to activate your Crema workspace.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-slate-700">Email Address</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  disabled
                  value={email}
                  className="h-10 pl-9 rounded-xl bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="owner_name" className="text-xs font-medium text-slate-700">Owner Name</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="owner_name"
                    required
                    value={form.owner_name}
                    onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                    placeholder="Amelia Chen"
                    className="h-10 pl-9 rounded-xl focus-visible:ring-amber-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="business_name" className="text-xs font-medium text-slate-700">Cafe Name (Business)</Label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="business_name"
                    required
                    value={form.business_name}
                    onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                    placeholder="Ember & Oak"
                    className="h-10 pl-9 rounded-xl focus-visible:ring-amber-500/20"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-medium text-slate-700">Phone Number</Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="phone"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 (555) 019-2834"
                  className="h-10 pl-9 rounded-xl focus-visible:ring-amber-500/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address" className="text-xs font-medium text-slate-700">Cafe Address</Label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="address"
                  required
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="123 Specialty Lane, Seattle WA"
                  className="h-10 pl-9 rounded-xl focus-visible:ring-amber-500/20"
                />
              </div>
            </div>

            <div className="border-t border-slate-200/60 pt-3">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Backup Password (Optional)</div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="password_complete" className="text-xs font-medium text-slate-700">Password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="password_complete"
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="••••••••"
                      className="h-10 pl-9 rounded-xl focus-visible:ring-amber-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-medium text-slate-700">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={form.confirmPassword}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                      placeholder="••••••••"
                      className="h-10 pl-9 rounded-xl focus-visible:ring-amber-500/20"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-6 h-11 w-full bg-[#1A1A1A] text-white hover:bg-black rounded-xl cursor-pointer"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Complete Registration & Enter Dashboard"}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
