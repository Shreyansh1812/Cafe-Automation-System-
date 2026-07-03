import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import type { Tenant } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function StatusBadge({ status }: { status: Tenant["status"] }) {
  if (status === "active") {
    return (
      <Badge className="rounded-full border-transparent bg-emerald-500/95 px-2.5 py-0.5 text-[11px] font-medium text-white shadow-sm hover:bg-emerald-500">
        Active
      </Badge>
    );
  }
  if (status === "trial") {
    return (
      <Badge
        variant="outline"
        className="rounded-full border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-800"
      >
        Trial
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="rounded-full border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600"
    >
      Suspended
    </Badge>
  );
}

export function TenantManagement() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => api.getTenants(),
  });

  const [statuses, setStatuses] = useState<Record<string, Tenant["status"]>>({});
  useEffect(() => {
    if (data) {
      setStatuses((prev) => {
        const next = { ...prev };
        for (const t of data) if (!(t.id in next)) next[t.id] = t.status;
        return next;
      });
    }
  }, [data]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    business_name: "",
    owner_name: "",
    email: "",
    phone: "",
    password: "",
    address: "",
  });

  const onboard = useMutation({
    mutationFn: api.onboardTenant,
    onSuccess: () => {
      toast.success("Cafe onboarded", {
        description: `${form.business_name} is now in the system.`,
      });
      setOpen(false);
      setForm({ business_name: "", owner_name: "", email: "", phone: "", password: "", address: "" });
      qc.invalidateQueries({ queryKey: ["tenants"] });
    },
  });

  const toggleStatus = (id: string) => {
    setStatuses((prev) => {
      const current = prev[id];
      const next = current === "active" ? "suspended" : "active";
      toast.success(next === "active" ? "Tenant activated" : "Tenant suspended");
      return { ...prev, [id]: next };
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Tenants</h1>
          <p className="text-sm text-slate-500">All cafes operating on Crema.</p>
        </div>
        {/* Add Cafe functionality removed for Super Admin - Owners onboard themselves */}
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
              <TableHead>Business</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading || !data
              ? Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="ml-auto h-5 w-9 rounded-full" /></TableCell>
                  </TableRow>
                ))
              : data.map((t) => {
                  const status = statuses[t.id] ?? t.status;
                  return (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 text-amber-900 ring-1 ring-amber-200/70">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{t.business_name}</div>
                            <div className="text-xs text-slate-500">{t.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-700">{t.owner_name}</TableCell>
                      <TableCell><StatusBadge status={status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <span className="text-xs text-slate-500">
                            {status === "active" ? "On" : "Off"}
                          </span>
                          <Switch
                            checked={status === "active"}
                            onCheckedChange={() => toggleStatus(t.id)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </motion.section>

      {/* Onboarding Dialog removed */}
    </div>
  );
}
