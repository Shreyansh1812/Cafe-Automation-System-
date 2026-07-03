import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Coffee, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { useAuth, dashboardPathFor } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { GOOGLE_CLIENT_ID, hasGoogleConfig } from "@/services/google-auth";

declare global {
  interface Window {
    google?: any;
  }
}

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Crema" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      navigate({ to: dashboardPathFor(user.role), replace: true });
      return;
    }

    if (!hasGoogleConfig) return;

    // Dynamically load Google Identity Services script
    const scriptId = "google-gsi-client";
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initializeGoogleSignIn();
      };
      document.body.appendChild(script);
    } else {
      initializeGoogleSignIn();
    }
  }, [user, navigate]);

  const initializeGoogleSignIn = () => {
    if (typeof window === "undefined" || !window.google) return;

    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredentialResponse,
      });

      const btnContainer = document.getElementById("google-signin-btn-container");
      if (btnContainer) {
        window.google.accounts.id.renderButton(
          btnContainer,
          { theme: "outline", size: "large", text: "signin_with", width: btnContainer.clientWidth || 320 }
        );
      }
    } catch (e) {
      console.error("Failed to initialize Google accounts SDK", e);
    }
  };

  const handleGoogleCredentialResponse = async (response: any) => {
    const credential = response.credential;
    if (!credential) {
      toast.error("Google sign-in failed. Please try again.");
      return;
    }

    setError(null);
    setGoogleLoading(true);

    try {
      const res = await api.loginWithGoogle({ credential });
      setGoogleLoading(false);

      if (!res.success) {
        setError(res.message);
        toast.error(res.message);
        return;
      }

      if (res.isNewUser) {
        toast.success("Google Auth successful! Please complete registration.");
        navigate({
          to: "/complete-registration",
          search: {
            email: res.email,
            name: res.name || "",
            google_id: res.google_id,
          },
        });
      } else {
        setUser({
          email: res.email,
          role: res.role,
          tenant_id: res.tenant_id,
          name: res.name,
          business_name: res.business_name,
        });
        toast.success(`Welcome back${res.name ? `, ${res.name}` : ""}`);
        navigate({ to: "/owner", replace: true });
      }
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      setError(err?.message || "Google Sign-In Failed");
      toast.error(err?.message || "Google Sign-In Failed");
      setGoogleLoading(false);
    }
  };

  const handleGoogleSignInMock = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      const mockEmail = window.prompt("Enter a mock Google email to test self-onboarding:", "owner@testcafe.com");
      if (mockEmail === null) {
        setGoogleLoading(false);
        return;
      }
      if (!mockEmail.trim()) {
        toast.error("Valid email is required for simulation.");
        setGoogleLoading(false);
        return;
      }
      const gEmail = mockEmail.trim().toLowerCase();
      const gName = gEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      
      toast.info("Google Client ID missing or default. Using Simulation Mode.", {
        description: `Logging in as ${gEmail}`
      });

      const res = await api.loginWithGoogle({
        isMock: true,
        mockEmail: gEmail,
        mockName: gName,
      });
      setGoogleLoading(false);

      if (!res.success) {
        setError(res.message);
        toast.error(res.message);
        return;
      }

      if (res.isNewUser) {
        toast.success("Google Auth successful! Please complete registration.");
        navigate({
          to: "/complete-registration",
          search: {
            email: res.email,
            name: res.name || "",
            google_id: res.google_id,
          },
        });
      } else {
        setUser({
          email: res.email,
          role: res.role,
          tenant_id: res.tenant_id,
          name: res.name,
          business_name: res.business_name,
        });
        toast.success(`Welcome back${res.name ? `, ${res.name}` : ""}`);
        navigate({ to: "/owner", replace: true });
      }
    } catch (err: any) {
      console.error("Google Sign-In Mock Error:", err);
      setError(err?.message || "Google Sign-In Failed");
      toast.error(err?.message || "Google Sign-In Failed");
      setGoogleLoading(false);
    }
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await api.login(email, password);
    setLoading(false);
    if (!res.success) {
      setError(res.message);
      toast.error(res.message);
      return;
    }
    setUser({
      email: res.email,
      role: res.role,
      tenant_id: res.tenant_id,
      name: res.name,
    });
    toast.success(`Welcome back${res.name ? `, ${res.name}` : ""}`);
    navigate({ to: dashboardPathFor(res.role), replace: true });
  }

  function fill(email: string) {
    setEmail(email);
    setPassword("demo");
  }

  return (
    <div className="grid min-h-screen w-full grid-cols-1 bg-slate-50 lg:grid-cols-2">
      {/* Left aesthetic panel */}
      <div className="relative hidden overflow-hidden bg-[#0F0F0F] lg:block">
        <div className="absolute inset-0">
          <div className="absolute -left-32 top-1/4 h-[480px] w-[480px] rounded-full bg-amber-500/20 blur-3xl" />
          <div className="absolute right-0 top-0 h-[420px] w-[420px] rounded-full bg-rose-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-[380px] w-[380px] rounded-full bg-indigo-500/10 blur-3xl" />
        </div>
        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-amber-400 backdrop-blur-md ring-1 ring-white/15">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">Crema</div>
              <div className="text-[11px] text-white/50">Cafe Automation</div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/70 backdrop-blur-md">
              <Coffee className="h-3 w-3 text-amber-400" /> Multi-tenant • Premium SaaS
            </div>
            <h2 className="max-w-md text-4xl font-semibold leading-tight tracking-tight">
              Run your cafe like the world's best ones do.
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-white/60">
              Loyalty, visits, coupons and analytics — all unified into one calm,
              tactile workspace built for owners and baristas.
            </p>
          </motion.div>

          <div className="text-[11px] text-white/40">
            © {new Date().getFullYear()} Crema Labs · All rights reserved
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center px-6 py-12 sm:px-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1A1A1A] text-amber-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="text-sm font-semibold tracking-tight text-slate-900">Crema</div>
            </div>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Sign in</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Welcome back. Enter your workspace credentials.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-medium text-slate-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@cafe.com"
                className="h-11 bg-white focus-visible:ring-2 focus-visible:ring-amber-500/20"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium text-slate-700">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 bg-white focus-visible:ring-2 focus-visible:ring-amber-500/20"
                required
              />
            </div>

            {error ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={loading || googleLoading}
              className="h-11 w-full bg-[#1A1A1A] text-white hover:bg-black cursor-pointer"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>

            <div className="relative my-4 flex items-center justify-center">
              <span className="absolute inset-x-0 border-t border-slate-200" />
              <span className="relative bg-slate-50 px-3 text-xs text-slate-500 uppercase tracking-wider">
                Or Onboarding
              </span>
            </div>

            {hasGoogleConfig ? (
              <div 
                id="google-signin-btn-container" 
                className="w-full flex justify-center hover:opacity-90 transition-opacity min-h-[44px]"
              />
            ) : (
              <Button
                type="button"
                onClick={handleGoogleSignInMock}
                disabled={loading || googleLoading}
                variant="outline"
                className="h-11 w-full border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 gap-2 font-medium shadow-sm transition-all duration-200 cursor-pointer"
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg className="h-4 w-4 text-slate-500 group-hover:text-slate-700" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                {googleLoading ? "Connecting…" : "Sign in with Google"}
              </Button>
            )}
          </form>

          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Demo accounts
            </div>
            <div className="mt-3 space-y-1.5 text-xs">
              {[
                { label: "Barista", email: "barista@cafe.com" },
                { label: "Owner", email: "owner@cafe.com" },
                { label: "Super Admin", email: "shreyansh@admin.com" },
              ].map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => fill(d.email)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-700">{d.label}</span>
                  <span className="font-mono text-[11px] text-slate-500">{d.email}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
