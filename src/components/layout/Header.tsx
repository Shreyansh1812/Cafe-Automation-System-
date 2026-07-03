import { useRouterState } from "@tanstack/react-router";
import { Bell, Search } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { MobileNav } from "./MobileNav";

const TITLES: Record<string, { title: string; subtitle: string }> = {
  "/owner": { title: "Dashboard", subtitle: "Today's performance at a glance" },
  "/owner/customers": { title: "Customers", subtitle: "Manage your loyal regulars" },
  "/owner/analytics": { title: "Analytics", subtitle: "Trends and revenue insights" },
  "/owner/baristas": { title: "Baristas", subtitle: "Manage cafe staff accounts" },
  "/barista": { title: "Register Visit", subtitle: "Log a new customer visit" },
  "/barista/redeem": { title: "Redeem Coupon", subtitle: "Validate and apply a coupon" },
  "/admin": { title: "Tenants", subtitle: "All cafes on the platform" },
};

function initials(user: { email: string; name?: string }): string {
  if (user.name) {
    return user.name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }
  return user.email.slice(0, 2).toUpperCase();
}

export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const meta = TITLES[pathname] ?? { title: "Crema", subtitle: "Cafe automation" };
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/70 backdrop-blur-md">
      <div className="flex items-center justify-between px-6 py-4 md:px-10">
        <div className="flex items-center gap-3">
          <MobileNav />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
              {meta.title}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">{meta.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-400 transition-colors focus-within:ring-2 focus-within:ring-amber-500/20 md:flex">
            <Search className="h-4 w-4" />
            <input
              className="w-48 bg-transparent text-slate-700 placeholder:text-slate-400 focus:outline-none"
              placeholder="Search customers, coupons…"
            />
          </div>
          <button className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white/80 text-slate-600 transition-colors hover:bg-slate-50">
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-amber-500" />
          </button>
          <div className="ml-1 flex h-10 w-10 items-center justify-center rounded-lg bg-[#1A1A1A] text-sm font-semibold text-amber-300">
            {user ? initials(user) : "··"}
          </div>
        </div>
      </div>
    </header>
  );
}
