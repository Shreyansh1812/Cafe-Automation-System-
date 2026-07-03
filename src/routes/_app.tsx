import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { PageTransition } from "@/components/layout/PageTransition";
import { useAuth, dashboardPathFor } from "@/lib/auth";

export const Route = createFileRoute("/_app")({
  component: AppShell,
});

function AppShell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    // Strict role-based gating for namespaces.
    if (pathname.startsWith("/admin") && user.role !== "super_admin") {
      navigate({ to: dashboardPathFor(user.role), replace: true });
    }
    if (pathname.startsWith("/owner") && user.role !== "owner") {
      navigate({ to: dashboardPathFor(user.role), replace: true });
    }
    if (pathname.startsWith("/barista") && user.role !== "barista") {
      navigate({ to: dashboardPathFor(user.role), replace: true });
    }
  }, [user, pathname, navigate]);

  if (!user) return null;

  return (
    <div className="flex min-h-screen w-full bg-slate-50 text-slate-900">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 px-6 py-8 md:px-10">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
