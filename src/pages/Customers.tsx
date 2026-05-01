import { useEffect, useMemo, useState } from "react";
import * as api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Trash2 } from "lucide-react";
import { inr } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import CustomerProfile from "@/components/CustomerProfile";

export default function Customers() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<api.Customer[]>([]);
  const [plans, setPlans] = useState<api.Plan[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", wallet_balance: 0, plan_id: "" });

  const load = async () => {
    try {
      const [c, p] = await Promise.all([api.getCustomers(), api.getPlans()]);
      setRows(c ?? []);
      setPlans(p ?? []);
    } catch { }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((c) =>
      c.name.toLowerCase().includes(s) || c.phone.toLowerCase().includes(s) || (c.email ?? "").toLowerCase().includes(s)
    );
  }, [rows, q]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCustomer({
        name: form.name,
        phone: form.phone,
        email: form.email || null,
        wallet_balance: form.wallet_balance,
        plan_id: form.plan_id || null,
      });
      toast.success("Customer added");
      setOpen(false);
      setForm({ name: "", phone: "", email: "", wallet_balance: 0, plan_id: "" });
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handlePlanChange = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    setForm({
      ...form,
      plan_id: planId,
      wallet_balance: plan ? plan.credit_value : 0
    });
  };

  const del = async (id: string) => {
    if (!confirm("Delete this customer?")) return;
    try {
      await api.deleteCustomer(id);
      toast.success("Deleted");
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">{rows.length} total</p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm"><Plus className="h-4 w-4 mr-1.5" /> Add customer</Button>
      </div>

      <Card>
        <CardContent className="p-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9 h-9" placeholder="Search by name, phone or email…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Wallet</TableHead>
              {isAdmin && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id} className="cursor-pointer text-sm" onClick={() => setSelected(c.id)}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.phone}</TableCell>
                <TableCell className="text-muted-foreground">{c.email ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={c.wallet_balance > 0 ? "default" : "secondary"}>{inr(c.wallet_balance)}</Badge>
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); del(c.id); }}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">No customers found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New customer</DialogTitle></DialogHeader>
          <form onSubmit={create} className="space-y-4">
            <div className="space-y-1.5"><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Email (optional)</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>

            <div className="space-y-1.5">
              <Label>Select Plan</Label>
              <Select value={form.plan_id} onValueChange={handlePlanChange}>
                <SelectTrigger>
                  <SelectValue placeholder="No plan (0 balance)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No plan</SelectItem>
                  {plans.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({inr(p.credit_value)} credit)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Starting Wallet Balance</Label>
              <div className="text-lg font-semibold text-primary">{inr(form.wallet_balance)}</div>
              <p className="text-[10px] text-muted-foreground italic">Balance is automatically set based on the selected plan.</p>
            </div>

            <DialogFooter><Button type="submit">Add Customer</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {selected && <CustomerProfile id={selected} onClose={() => { setSelected(null); load(); }} />}
    </div>
  );
}
