import { createFileRoute } from "@tanstack/react-router";
import { Analytics } from "@/pages/owner/Analytics";

export const Route = createFileRoute("/_app/owner/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Crema" },
      { name: "description", content: "Revenue and customer growth analytics." },
    ],
  }),
  component: Analytics,
});
