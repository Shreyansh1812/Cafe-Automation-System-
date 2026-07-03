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
import { TrendingUp, Users, ArrowUpRight, DollarSign, Award } from "lucide-react";
import { api } from "@/services/api";
import { useAuth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function Analytics() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id ?? "";

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", tenantId],
    queryFn: () => api.getAnalytics(tenantId),
    enabled: !!tenantId,
  });

  const totalRevenue = data?.revenue.reduce((sum: number, r: any) => sum + r.revenue, 0) || 0;
  const totalVisits = data?.revenue.reduce((sum: number, r: any) => sum + r.visits, 0) || 0;
  const totalNewCustomers = data?.growth.reduce((sum: number, g: any) => sum + g.new_customers, 0) || 0;

  const chartData = data?.revenue.map((r: any) => ({
    date: formatDate(r.date),
    revenue: r.revenue,
    visits: r.visits,
  })) || [];

  const growthData = data?.growth.map((g: any) => ({
    date: formatDate(g.date),
    newCustomers: g.new_customers,
  })) || [];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Page Heading */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-500">In-depth insights into your cafe's revenue and audience trends.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <motion.div
          whileHover={{ y: -2 }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-200/50">
              <DollarSign className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              30 Days
            </span>
          </div>
          <div className="mt-4">
            <div className="text-[12px] font-medium uppercase tracking-wider text-slate-500">30D Revenue</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              {isLoading ? <Skeleton className="h-7 w-28" /> : formatCurrency(totalRevenue)}
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/50">
              <TrendingUp className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              30 Days
            </span>
          </div>
          <div className="mt-4">
            <div className="text-[12px] font-medium uppercase tracking-wider text-slate-500">30D Total Visits</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              {isLoading ? <Skeleton className="h-7 w-20" /> : totalVisits.toLocaleString()}
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-700 ring-1 ring-rose-200/50">
              <Users className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              30 Days
            </span>
          </div>
          <div className="mt-4">
            <div className="text-[12px] font-medium uppercase tracking-wider text-slate-500">New Customers</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              {isLoading ? <Skeleton className="h-7 w-16" /> : totalNewCustomers.toLocaleString()}
            </div>
          </div>
        </motion.div>
      </div>

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
            <p className="text-xs text-slate-500">Last 30 days performance</p>
          </div>
          <div className="h-72 w-full">
            {isLoading ? (
              <Skeleton className="h-full w-full rounded-xl" />
            ) : chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                No revenue data recorded in this period.
              </div>
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
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
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
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                No new customer additions recorded.
              </div>
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
        className="rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <Award className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900">Top Regular Customers</h2>
            <p className="text-sm text-slate-500">Ranked by lifetime coffee spend</p>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Visits</TableHead>
              <TableHead className="text-right">Total Spent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-12" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-16" /></TableCell>
                </TableRow>
              ))
            ) : !data?.topCustomers || data.topCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-slate-500">
                  No regular customers recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              data.topCustomers.map((c: any, index: number) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium text-slate-900 flex items-center gap-2">
                    <span className="text-slate-400 font-mono text-xs w-4">#{index + 1}</span>
                    {c.name}
                  </TableCell>
                  <TableCell className="text-slate-600">{c.phone}</TableCell>
                  <TableCell className="text-right tabular-nums text-slate-700">{c.total_visits}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-[#1A1A1A]">
                    {formatCurrency(c.lifetime_spent)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </motion.section>
    </div>
  );
}
