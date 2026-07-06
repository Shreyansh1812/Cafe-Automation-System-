import { createFileRoute } from "@tanstack/react-router";
import RedeemCoupon from "@/pages/barista/RedeemCoupon";

export const Route = createFileRoute("/_app/barista/redeem")({
  head: () => ({ meta: [{ title: "Redeem Coupon — Crema" }] }),
  component: RedeemCoupon,
});
