import { Award } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { TopCustomer } from "@/types";
import { formatCurrencyINR } from "@/utils/date";

interface TopCustomersTableProps {
  customers: TopCustomer[] | undefined;
  isLoading?: boolean;
}

function formatCurrency(n: number) {
  return formatCurrencyINR(n);
}

export function TopCustomersTable({ customers, isLoading = false }: TopCustomersTableProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
          <Award className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-900">Top Regular Customers</h2>
          <p className="text-xs text-slate-500">Ranked by lifetime spend</p>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-6">Customer</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead className="text-right">Visits</TableHead>
            <TableHead className="text-right pr-6">Total Spent</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell className="pl-6"><Skeleton className="h-4 w-36" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-12" /></TableCell>
                <TableCell className="text-right pr-6"><Skeleton className="ml-auto h-4 w-16" /></TableCell>
              </TableRow>
            ))
          ) : !customers || customers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="py-8 text-center text-sm text-slate-500">
                No regular customers recorded yet.
              </TableCell>
            </TableRow>
          ) : (
            customers.map((c, index) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium text-slate-900 pl-6 flex items-center gap-2">
                  <span className="text-slate-400 font-mono text-xs w-4">#{index + 1}</span>
                  {c.name}
                </TableCell>
                <TableCell className="text-slate-600">{c.phone}</TableCell>
                <TableCell className="text-right tabular-nums text-slate-700">{c.total_visits}</TableCell>
                <TableCell className="text-right font-medium tabular-nums text-[#1A1A1A] pr-6">
                  {formatCurrency(c.lifetime_spent)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
