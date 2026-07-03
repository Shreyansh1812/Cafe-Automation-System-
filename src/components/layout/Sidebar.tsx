import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  LineChart,
  Coffee,
  Ticket,
  Building2,
  Sparkles,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, type Role } from "@/lib/auth";

export type NavItem = { to: string; label: string; icon: typeof Coffee };
export type Section = { heading: string; items: NavItem[]; roles: Role[] };

export const sections: Section[] = [
  {
    heading: "Owner",
    roles: ["owner"],
    items: [
      { to: "/owner", label: "Dashboard", icon: LayoutDashboard },
      { to: "/owner/customers", label: "Customers", icon: Users },
      { to: "/owner/baristas", label: "Baristas", icon: Coffee },
      { to: "/owner/analytics", label: "Analytics", icon: LineChart },
    ],
  },
  {
    heading: "Barista",
    roles: ["barista"],
    items: [
      { to: "/barista", label: "Register Visit", icon: Coffee },
      { to: "/barista/redeem", label: "Redeem Coupon", icon: Ticket },
    ],
  },
  {
    heading: "Admin",
    roles: ["super_admin"],
    items: [{ to: "/admin", label: "Tenants", icon: Building2 }],
  },
];

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, logout } = useAuth();

  // STRICT: only render sections the current role is allowed to see.
  const visibleSections = user
    ? sections.filter((s) => s.roles.includes(user.role))
    : [];

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-slate-200/70 bg-white/70 px-4 py-6 backdrop-blur-md md:flex md:flex-col">
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1A1A1A] text-amber-400 shadow-sm">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight text-slate-900">Crema</div>
          <div className="text-[11px] text-slate-500">Cafe Automation</div>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto">
        {visibleSections.map((section) => (
          <div key={section.heading}>
            <div className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-slate-400">
              {section.heading}
            </div>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active =
                  pathname === item.to ||
                  (item.to !== "/owner" &&
                    item.to !== "/barista" &&
                    item.to !== "/admin" &&
                    pathname.startsWith(item.to));
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                        active
                          ? "bg-[#1A1A1A] text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 transition-colors",
                          active ? "text-amber-400" : "text-slate-400 group-hover:text-slate-700",
                        )}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {user ? (
        <div className="mt-6 space-y-3">
          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-amber-50 to-white p-4">
            <div className="text-xs font-semibold tracking-tight text-slate-900">
              {user.role === "super_admin"
                ? "Platform Console"
                : user.business_name || "Cafe"}
            </div>
            <div className="text-[11px] text-slate-500">
              {user.role === "owner"
                ? "Owner Workspace"
                : user.role === "barista"
                  ? "Barista Workspace"
                  : "Admin Workspace"}
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      ) : null}
    </aside>
  );
}
