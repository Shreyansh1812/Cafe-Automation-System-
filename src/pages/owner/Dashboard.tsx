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
import { Users, Coffee, IndianRupee, Ticket } from "lucide-react";
import { api } from "@/services/api";
import { useAuth } from "@/lib/auth";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCurrencyINR } from "@/utils/date";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const DEFAULT_TENANT_ID = "550e8400-e29b-41d4-a716-446655440000";

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

function formatCurrency(n: number) {
  return formatCurrencyINR(n);
}

export function Dashboard() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id || DEFAULT_TENANT_ID;

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", tenantId],
    queryFn: () => api.getDashboardStats(tenantId),
    enabled: !!tenantId,
    refetchInterval: 30000, // Auto-refresh in background every 30 seconds
  });

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Stat Cards Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          title="Total Customers"
          value={data?.totalCustomers}
          previousValue={data?.previousCustomers}
          icon={Users}
          isLoading={isLoading}
          format={(v) => v.toLocaleString()}
        />
        <StatCard
          title="Total Visits"
          value={data?.totalVisits}
          previousValue={data?.previousVisits}
          icon={Coffee}
          isLoading={isLoading}
          format={(v) => v.toLocaleString()}
        />
        <StatCard
          title="Lifetime Revenue"
          value={data?.lifetimeRevenue}
          previousValue={data?.previousRevenue}
          icon={IndianRupee}
          isLoading={isLoading}
          format={formatCurrency}
        />
        <StatCard
          title="Active Coupons"
          value={data?.activeCoupons}
          previousValue={data?.previousCoupons}
          icon={Ticket}
          isLoading={isLoading}
          format={(v) => v.toString()}
          isCoupon={true}
        />
      </motion.div>

      {/* Visits & Revenue Chart */}
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
          {isLoading ? (
            <Skeleton className="h-full w-full rounded-xl" />
          ) : !data || !data.trend || data.trend.length === 0 ? (
            <EmptyState
              title="No Visits or Revenue Recorded"
              description="Visits and revenue data will show up here once baristas start logging visits."
              icon={<Coffee className="h-8 w-8 text-slate-300" />}
            />
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

      {/* Recent Visits Table */}
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
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right pr-6">When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="pl-6"><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-16" /></TableCell>
                  <TableCell className="text-right pr-6"><Skeleton className="ml-auto h-4 w-12" /></TableCell>
                </TableRow>
              ))
            ) : !data || !data.recentVisits || data.recentVisits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-slate-500">
                  No visits recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              data.recentVisits.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium text-slate-900 pl-6">{v.customer_name}</TableCell>
                  <TableCell className="text-slate-600">{v.phone}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-slate-900">
                    {formatCurrency(v.amount)}
                  </TableCell>
                  <TableCell className="text-right text-slate-500 pr-6">{v.timestamp}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </motion.section>
    </div>
  );
}
