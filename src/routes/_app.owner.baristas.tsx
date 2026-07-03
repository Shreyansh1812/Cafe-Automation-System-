import { createFileRoute } from "@tanstack/react-router";
import { BaristaList } from "@/pages/owner/BaristaList";

export const Route = createFileRoute("/_app/owner/baristas")({
  head: () => ({
    meta: [
      { title: "Baristas — Crema" },
      { name: "description", content: "Manage baristas working at your cafe." },
    ],
  }),
  component: BaristaList,
});
