import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, Users, IndianRupee, Award, ShoppingBag } from "lucide-react";
import { api } from "@/services/api";
import { useAuth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { TopCustomersTable } from "@/components/shared/TopCustomersTable";
import { formatCurrencyINR } from "@/utils/date";

function formatCurrency(n: number) {
  return formatCurrencyINR(n);
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type DateRange = "7d" | "30d" | "90d";

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function Analytics() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id ?? "";
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", tenantId, dateRange],
    queryFn: () => api.getAnalytics(tenantId, dateRange),
    enabled: !!tenantId,
    refetchInterval: 30000, // Auto-refresh in background every 30 seconds
  });

  const chartData = data?.revenue?.map((r: any) => ({
    date: formatDate(r.date),
    revenue: r.revenue,
    visits: r.visits,
  })) || [];

  const growthData = data?.growth?.map((g: any) => ({
    date: formatDate(g.date),
    newCustomers: g.new_customers,
  })) || [];

  const rangeText = dateRange === "7d" ? "7 Days" : dateRange === "30d" ? "30 Days" : "90 Days";

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Page Heading and Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-500">In-depth insights into your cafe's revenue and audience trends.</p>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1 w-fit">
          {(["7d", "30d", "90d"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
                dateRange === range
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/50"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {range === "7d" ? "7 Days" : range === "30d" ? "30 Days" : "90 Days"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {/* Total Revenue */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -2 }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-200/50">
              <IndianRupee className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              {rangeText}
            </span>
          </div>
          <div className="mt-4">
            <div className="text-[12px] font-medium uppercase tracking-wider text-slate-500">Total Revenue</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              {isLoading ? <Skeleton className="h-7 w-28" /> : formatCurrency(data?.totalRevenue || 0)}
            </div>
          </div>
        </motion.div>

        {/* Total Visits */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -2 }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/50">
              <TrendingUp className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
              {rangeText}
            </span>
          </div>
          <div className="mt-4">
            <div className="text-[12px] font-medium uppercase tracking-wider text-slate-500">Total Visits</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              {isLoading ? <Skeleton className="h-7 w-20" /> : (data?.totalVisits || 0).toLocaleString()}
            </div>
          </div>
        </motion.div>

        {/* Avg Spend per Visit */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -2 }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/50">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {rangeText}
            </span>
          </div>
          <div className="mt-4">
            <div className="text-[12px] font-medium uppercase tracking-wider text-slate-500">Avg. Spend per Visit</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              {isLoading ? <Skeleton className="h-7 w-24" /> : formatCurrency(data?.avgSpend || 0)}
            </div>
          </div>
        </motion.div>

        {/* Active Customers */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -2 }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-700 ring-1 ring-rose-200/50">
              <Users className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
              {rangeText}
            </span>
          </div>
          <div className="mt-4">
            <div className="text-[12px] font-medium uppercase tracking-wider text-slate-500">Active Customers</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              {isLoading ? <Skeleton className="h-7 w-16" /> : (data?.activeCustomers || 0).toLocaleString()}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue Area Chart */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-4">
            <h2 className="text-base font-semibold tracking-tight text-slate-900">Daily Revenue History</h2>
            <p className="text-xs text-slate-500">Performance in selected period</p>
          </div>
          <div className="h-72 w-full">
            {isLoading ? (
              <Skeleton className="h-full w-full rounded-xl" />
            ) : chartData.length === 0 ? (
              <EmptyState
                title="No Revenue Data Recorded"
                description="Revenue data will appear here once you have customers and visits."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 8px 24px -12px rgba(15,23,42,0.15)",
                      fontSize: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#f59e0b" strokeWidth={2} fill="url(#gRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.section>

        {/* Customer Growth Bar Chart */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-4">
            <h2 className="text-base font-semibold tracking-tight text-slate-900">Customer Onboarding Growth</h2>
            <p className="text-xs text-slate-500">Daily additions of loyal customers</p>
          </div>
          <div className="h-72 w-full">
            {isLoading ? (
              <Skeleton className="h-full w-full rounded-xl" />
            ) : growthData.length === 0 ? (
              <EmptyState
                title="No Customer Additions Recorded"
                description="Customer growth data will show up here as customers register."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={growthData} margin={{ left: -24, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 8px 24px -12px rgba(15,23,42,0.15)",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="newCustomers" name="New Customers" fill="#1A1A1A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.section>
      </div>

      {/* Top Customers Table */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <TopCustomersTable customers={data?.topCustomers} isLoading={isLoading} />
      </motion.section>
    </div>
  );
}
