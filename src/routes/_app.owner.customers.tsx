import { createFileRoute } from "@tanstack/react-router";
import { CustomerList } from "@/pages/owner/CustomerList";

export const Route = createFileRoute("/_app/owner/customers")({
  head: () => ({
    meta: [
      { title: "Customers — Crema" },
      { name: "description", content: "Search and manage your cafe's customers." },
    ],
  }),
  component: CustomerList,
});
