import { createFileRoute } from "@tanstack/react-router";
import { TenantManagement } from "@/pages/admin/TenantManagement";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({
    meta: [
      { title: "Tenants — Crema Admin" },
      { name: "description", content: "Manage all cafes operating on Crema." },
    ],
  }),
  component: TenantManagement,
});
