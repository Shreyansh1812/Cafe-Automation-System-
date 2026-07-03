import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Sparkles, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { sections } from "./Sidebar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, logout } = useAuth();

  const visibleSections = user
    ? sections.filter((s) => s.roles.includes(user.role))
    : [];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 border-slate-200 bg-white/80 text-slate-600 md:hidden"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 bg-white p-6 flex flex-col h-full border-r border-slate-200">
        <SheetHeader className="text-left mb-6">
          <SheetTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A1A1A] text-amber-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight text-slate-900">Crema</div>
              <div className="text-[11px] font-normal text-slate-500">Cafe Automation</div>
            </div>
          </SheetTitle>
          <SheetDescription className="sr-only">Mobile Navigation Drawer</SheetDescription>
        </SheetHeader>

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
                        onClick={() => setOpen(false)}
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
          <div className="mt-auto pt-6 border-t border-slate-100 space-y-3">
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
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
