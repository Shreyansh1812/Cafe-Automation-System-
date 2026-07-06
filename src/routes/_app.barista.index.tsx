import { createFileRoute } from "@tanstack/react-router";
import RegisterVisit from "@/pages/barista/RegisterVisit";

export const Route = createFileRoute("/_app/barista/")({
  head: () => ({ meta: [{ title: "Log Customer Visit — Crema" }] }),
  component: RegisterVisit,
});
