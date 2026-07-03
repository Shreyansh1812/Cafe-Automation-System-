import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Users, Coffee, DollarSign, Ticket, ArrowUpRight } from "lucide-react";
import { api } from "@/services/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/owner/")({
  head: () => ({
    meta: [
      { title: "Owner Dashboard — Crema" },
      { name: "description", content: "Cafe performance overview for owners." },
    ],
  }),
  component: OwnerDashboard,
});

const DEFAULT_TENANT_ID = "550e8400-e29b-41d4-a716-446655440000";

const stat = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function OwnerDashboard() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id || DEFAULT_TENANT_ID;

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", tenantId],
    queryFn: () => api.getDashboardStats(tenantId),
  });

  const cards = [
    { label: "Total Customers", value: data?.totalCustomers, icon: Users, delta: "+12.4%", format: (v: number) => v.toLocaleString() },
    { label: "Total Visits", value: data?.totalVisits, icon: Coffee, delta: "+8.1%", format: (v: number) => v.toLocaleString() },
    { label: "Lifetime Revenue", value: data?.lifetimeRevenue, icon: DollarSign, delta: "+18.7%", format: formatCurrency },
    { label: "Active Coupons", value: data?.activeCoupons, icon: Ticket, delta: "+3", format: (v: number) => v.toString() },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={c.label}
              variants={stat}
              whileHover={{ y: -2 }}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-700 ring-1 ring-slate-200/70">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200/70">
                  <ArrowUpRight className="h-3 w-3" />
                  {c.delta}
                </span>
              </div>
              <div className="mt-4">
                <div className="text-[12px] font-medium uppercase tracking-wider text-slate-500">
                  {c.label}
                </div>
                <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                  {isLoading || c.value === undefined ? (
                    <Skeleton className="h-7 w-24" />
                  ) : (
                    c.format(c.value)
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900">
              Visits & Revenue
            </h2>
            <p className="text-sm text-slate-500">Last 7 days</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#1A1A1A]" /> Visits
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Revenue
            </span>
          </div>
        </div>
        <div className="h-72 w-full">
          {isLoading || !data ? (
            <Skeleton className="h-full w-full rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trend} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gVisits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1A1A1A" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#1A1A1A" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 8px 24px -12px rgba(15,23,42,0.15)",
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} fill="url(#gRev)" />
                <Area type="monotone" dataKey="visits" stroke="#1A1A1A" strokeWidth={2} fill="url(#gVisits)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900">Recent Visits</h2>
            <p className="text-sm text-slate-500">Live feed across your locations</p>
          </div>
          <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50">
            View all
          </button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading || !data
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-12" /></TableCell>
                  </TableRow>
                ))
              : data.recentVisits.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium text-slate-900">{v.customer_name}</TableCell>
                    <TableCell className="text-slate-600">{v.phone}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-slate-900">
                      {formatCurrency(v.amount)}
                    </TableCell>
                    <TableCell className="text-right text-slate-500">{v.timestamp}</TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </motion.section>
    </div>
  );
}
