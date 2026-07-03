import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Loader2, User, Phone, Mail, Lock, Trash } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function BaristaList() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id ?? "";
  const qc = useQueryClient();

  const { data: baristas, isLoading } = useQuery({
    queryKey: ["baristas", tenantId],
    queryFn: () => api.getBaristas(tenantId),
    enabled: !!tenantId,
  });

  const [open, setOpen] = useState(false);
  const [validatingEmail, setValidatingEmail] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      api.createBarista({
        tenant_id: tenantId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
      }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Barista added", {
          description: `${form.name} can now sign in to Crema.`,
        });
        setOpen(false);
        setForm({ name: "", email: "", phone: "", password: "" });
        qc.invalidateQueries({ queryKey: ["baristas", tenantId] });
      } else {
        toast.error(res.message || "Could not add barista");
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to contact database");
    },
  });

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Please enter the barista's full name.");
      return;
    }
    if (!form.email.trim()) {
      toast.error("Please enter an email address.");
      return;
    }
    if (!isValidEmail(form.email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setValidatingEmail(true);
    try {
      const emailExists = await api.checkBaristaEmail(form.email, tenantId);
      if (emailExists) {
        toast.error("This email is already registered as a barista. Please use a different email.");
        setValidatingEmail(false);
        return;
      }
    } catch (err) {
      console.warn("Pre-submission email check failed, proceeding anyway.");
    } finally {
      setValidatingEmail(false);
    }

    mutation.mutate(form);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteBarista(id),
    onSuccess: (res: any) => {
      if (res.success) {
        toast.success("Barista account deleted.");
        qc.invalidateQueries({ queryKey: ["baristas", tenantId] });
      } else {
        toast.error(res.message || "Could not delete barista");
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete barista");
    },
  });

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete barista "${name}"?`)) {
      deleteMutation.mutate(id);
    }
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
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Baristas</h1>
          <p className="text-sm text-slate-500">Manage cafe staff accounts and permissions.</p>
        </div>
        <Button
          onClick={() => setOpen(true)}
          className="h-10 gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" /> Add Barista
        </Button>
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
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="ml-auto h-8 w-8 rounded-lg" /></TableCell>
                  </TableRow>
                ))
              : !baristas || baristas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-sm text-slate-500">
                    No baristas added yet. Use the button above to onboard staff.
                  </TableCell>
                </TableRow>
              ) : (
                baristas.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 ring-1 ring-slate-100">
                          <AvatarFallback className="bg-gradient-to-br from-amber-50 to-amber-100 text-xs font-semibold text-amber-900">
                            {initials(b.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-slate-900">{b.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600 font-mono text-xs">{b.email}</TableCell>
                    <TableCell className="text-slate-600">{b.phone || "—"}</TableCell>
                    <TableCell className="text-slate-500 text-xs">
                      {b.created_at ? new Date(b.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(b.id, b.name)}
                        disabled={deleteMutation.isPending}
                        className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
          </TableBody>
        </Table>
      </motion.section>

      <Dialog open={open} onOpenChange={(o) => !mutation.isPending && setOpen(o)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Cafe Barista</DialogTitle>
            <DialogDescription>
              Create login credentials for a cafe staff member.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Amelia Chen"
                  className="h-10 pl-9 rounded-xl focus-visible:ring-amber-500/20"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="barista@cafe.com"
                  className="h-10 pl-9 rounded-xl focus-visible:ring-amber-500/20"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone number</Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="h-10 pl-9 rounded-xl focus-visible:ring-amber-500/20"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Login Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="h-10 pl-9 rounded-xl focus-visible:ring-amber-500/20"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={mutation.isPending || validatingEmail}
                className="h-10 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending || validatingEmail}
                className="h-10 gap-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800"
              >
                {(mutation.isPending || validatingEmail) && <Loader2 className="h-4 w-4 animate-spin" />}
                {mutation.isPending || validatingEmail ? "Creating…" : "Create Barista"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
