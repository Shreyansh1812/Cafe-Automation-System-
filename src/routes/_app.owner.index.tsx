import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/pages/owner/Dashboard";

export const Route = createFileRoute("/_app/owner/")({
  head: () => ({
    meta: [
      { title: "Owner Dashboard — Crema" },
      { name: "description", content: "Cafe performance overview for owners." },
    ],
  }),
  component: Dashboard,
});
