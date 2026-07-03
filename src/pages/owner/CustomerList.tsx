import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Coffee, Phone, Calendar, Crown } from "lucide-react";
import { api } from "@/services/api";
import { useAuth } from "@/lib/auth";
import type { Customer } from "@/types";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function tierFor(spent: number): { label: string; tone: string } {
  if (spent >= 500) return { label: "Gold", tone: "bg-amber-100 text-amber-800 ring-amber-200" };
  if (spent >= 200) return { label: "Silver", tone: "bg-slate-100 text-slate-700 ring-slate-200" };
  return { label: "Bronze", tone: "bg-orange-50 text-orange-700 ring-orange-200" };
}

const MOCK_FAVORITES = ["Oat Flat White", "Almond Croissant", "Cold Brew"];

export function CustomerList() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id ?? "tenant-1";
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["customers", tenantId],
    queryFn: () => api.getCustomers(tenantId),
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q),
    );
  }, [data, query]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500">Search and explore your CRM.</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or phone…"
            className="h-10 rounded-xl border-slate-200 bg-white/80 pl-9 shadow-sm backdrop-blur"
          />
        </div>
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Total Visits</TableHead>
              <TableHead className="text-right">Lifetime Spend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-12" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-20" /></TableCell>
                  </TableRow>
                ))
              : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-sm text-slate-500">
                    No customers match your search.
                  </TableCell>
                </TableRow>
              ) : filtered.map((c) => (
                <TableRow
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium text-slate-900">{c.name}</TableCell>
                  <TableCell className="text-slate-600">{c.phone}</TableCell>
                  <TableCell className="text-right tabular-nums text-slate-700">{c.total_visits}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-slate-900">
                    {formatCurrency(c.lifetime_spent)}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </motion.section>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {selected && (() => {
            const tier = tierFor(selected.lifetime_spent);
            return (
              <>
                <SheetHeader className="text-left">
                  <SheetTitle className="sr-only">{selected.name}</SheetTitle>
                  <SheetDescription className="sr-only">Customer profile</SheetDescription>
                </SheetHeader>

                <div className="mt-2 flex flex-col items-center text-center">
                  <Avatar className="h-20 w-20 ring-4 ring-amber-100">
                    <AvatarFallback className="bg-gradient-to-br from-amber-100 to-amber-200 text-lg font-semibold text-amber-900">
                      {initials(selected.name)}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="mt-4 text-lg font-semibold tracking-tight text-slate-900">
                    {selected.name}
                  </h2>
                  <p className="text-xs text-slate-500">ID · {selected.id}</p>
                  <Badge
                    variant="outline"
                    className={`mt-3 gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${tier.tone}`}
                  >
                    <Crown className="h-3 w-3" /> {tier.label} Tier
                  </Badge>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                      Visits
                    </div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                      {selected.total_visits}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                      Lifetime
                    </div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                      {formatCurrency(selected.lifetime_spent)}
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-700">{selected.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-700">
                      Birthday · {selected.birthday}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-700">
                      Last visit · {selected.last_visit}
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    Favorites
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {MOCK_FAVORITES.map((f) => (
                      <span
                        key={f}
                        className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800"
                      >
                        <Coffee className="h-3 w-3" /> {f}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
