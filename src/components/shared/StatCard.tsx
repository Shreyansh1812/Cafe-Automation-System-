import { motion } from "framer-motion";
import { LucideIcon, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  title: string;
  value: number | undefined;
  previousValue: number | undefined;
  icon: LucideIcon;
  isLoading?: boolean;
  format?: (v: number) => string;
  isCoupon?: boolean;
}

const statAnimation = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

export function StatCard({
  title,
  value,
  previousValue,
  icon: Icon,
  isLoading = false,
  format = (v) => v.toLocaleString(),
  isCoupon = false,
}: StatCardProps) {
  // Calculate percentage change or difference
  let percentChange = 0;
  let trend: "up" | "down" | "neutral" = "neutral";
  let hasData = false;

  const val = value ?? 0;
  const prevVal = previousValue ?? 0;

  if (value !== undefined && previousValue !== undefined) {
    hasData = val > 0 || prevVal > 0;
    if (prevVal > 0) {
      percentChange = ((val - prevVal) / prevVal) * 100;
      if (percentChange > 0.05) trend = "up";
      else if (percentChange < -0.05) trend = "down";
    } else if (val > 0) {
      percentChange = 100;
      trend = "up";
    }
  }

  const formattedPercent = percentChange.toFixed(1);

  return (
    <motion.div
      variants={statAnimation}
      whileHover={{ y: -2 }}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-700 ring-1 ring-slate-200/70">
          <Icon className="h-4 w-4" />
        </div>

        {isLoading ? (
          <Skeleton className="h-5 w-16 rounded-full" />
        ) : hasData ? (
          trend === "up" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200/70">
              <ArrowUpRight className="h-3 w-3" />
              {isCoupon ? `+${val - prevVal}` : `+${formattedPercent}%`}
            </span>
          ) : trend === "down" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 ring-1 ring-rose-200/70">
              <ArrowDownRight className="h-3 w-3" />
              {isCoupon ? `${val - prevVal}` : `${formattedPercent}%`}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200/70">
              <Minus className="h-3 w-3" />
              No change
            </span>
          )
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-400 ring-1 ring-slate-200/70">
            --
          </span>
        )}
      </div>

      <div className="mt-4">
        <div className="text-[12px] font-medium uppercase tracking-wider text-slate-500">
          {title}
        </div>
        <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
          {isLoading || value === undefined ? (
            <Skeleton className="h-7 w-24" />
          ) : (
            format(value)
          )}
        </div>
      </div>
    </motion.div>
  );
}
