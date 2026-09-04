import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { inr } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

export default function Plans() {
  const [plans, setPlans] = useState<api.Plan[]>([]);
  const [services, setServices] = useState<api.Service[]>([]);
  const [pf, setPf] = useState({ name: "", price: "", credit_value: "" });
  const [sf, setSf] = useState({ code: "", name: "", price: "" });
  const [editSvc, setEditSvc] = useState<api.Service | null>(null);
  const [editForm, setEditForm] = useState({ code: "", name: "", price: "", active: true });

  const load = async () => {
    try {
      const [p, s] = await Promise.all([api.getPlans(), api.getServices(false)]);
      setPlans(p ?? []);
      setServices(s ?? []);
    } catch { }
  };
  useEffect(() => { load(); }, []);

  const addPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createPlan({ name: pf.name, price: Number(pf.price), credit_value: Number(pf.credit_value) });
      toast.success("Plan added");
      setPf({ name: "", price: "", credit_value: "" });
      load();
    } catch (err: any) { toast.error(err.message); }
  };

  const addSvc = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createService({ code: sf.code || null, name: sf.name, price: Number(sf.price) });
      toast.success("Service added");
      setSf({ code: "", name: "", price: "" });
      load();
    } catch (err: any) { toast.error(err.message); }
  };

  const delPlan = async (id: string) => {
    if (!confirm("Delete?")) return;
    try { await api.deletePlan(id); load(); } catch (err: any) { toast.error(err.message); }
  };

  const delSvc = async (id: string) => {
    if (!confirm("Delete?")) return;
    try { await api.deleteService(id); load(); } catch (err: any) { toast.error(err.message); }
  };

  const openEditSvc = (s: api.Service) => {
    setEditSvc(s);
    setEditForm({ code: s.code ?? "", name: s.name, price: String(s.price), active: s.active });
  };

  const saveSvc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSvc) return;
    try {
      await api.updateService(editSvc.id, {
        code: editForm.code || null,
        name: editForm.name,
        price: Number(editForm.price),
        active: editForm.active,
      });
      toast.success("Service updated");
      setEditSvc(null);
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plans &amp; Services</h1>
        <p className="text-sm text-muted-foreground">Manage membership plans and the salon's service catalog</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Plans</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <form onSubmit={addPlan} className="grid grid-cols-4 gap-2 items-end">
              <div className="space-y-1.5 col-span-2"><Label>Name</Label><Input required value={pf.name} onChange={(e) => setPf({ ...pf, name: e.target.value })} placeholder="10k for 13k" /></div>
              <div className="space-y-1.5"><Label>Price</Label><Input required type="number" step="0.01" value={pf.price} onChange={(e) => setPf({ ...pf, price: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Credit</Label><Input required type="number" step="0.01" value={pf.credit_value} onChange={(e) => setPf({ ...pf, credit_value: e.target.value })} /></div>
              <Button type="submit" size="sm" className="col-span-4"><Plus className="h-4 w-4 mr-1.5" /> Add plan</Button>
            </form>
            <Table>
              <TableHeader><TableRow className="text-xs"><TableHead>Name</TableHead><TableHead>Price</TableHead><TableHead>Credit</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
              <TableBody>
                {plans.map((p) => (
                  <TableRow key={p.id} className="text-sm">
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{inr(p.price)}</TableCell>
                    <TableCell>{inr(p.credit_value)}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => delPlan(p.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
                  </TableRow>
                ))}
                {plans.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-4">No plans yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Services</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <form onSubmit={addSvc} className="grid grid-cols-4 gap-2 items-end">
              <div className="space-y-1.5"><Label>Code</Label><Input value={sf.code} onChange={(e) => setSf({ ...sf, code: e.target.value })} placeholder="HC01" /></div>
              <div className="space-y-1.5 col-span-2"><Label>Name</Label><Input required value={sf.name} onChange={(e) => setSf({ ...sf, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Price</Label><Input required type="number" step="0.01" value={sf.price} onChange={(e) => setSf({ ...sf, price: e.target.value })} /></div>
              <Button type="submit" size="sm" className="col-span-4"><Plus className="h-4 w-4 mr-1.5" /> Add service</Button>
            </form>
            <Table>
              <TableHeader><TableRow className="text-xs"><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Price</TableHead><TableHead>Status</TableHead><TableHead className="w-20" /></TableRow></TableHeader>
              <TableBody>
                {services.map((s) => (
                  <TableRow key={s.id} className={`text-sm ${!s.active ? "opacity-60" : ""}`}>
                    <TableCell className="text-muted-foreground">{s.code ?? "—"}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{inr(s.price)}</TableCell>
                    <TableCell>
                      <Badge variant={s.active ? "default" : "secondary"}>{s.active ? "Active" : "Hidden"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditSvc(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => delSvc(s.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {services.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-4">No services yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editSvc} onOpenChange={(open) => !open && setEditSvc(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit service</DialogTitle></DialogHeader>
          <form onSubmit={saveSvc} className="space-y-4">
            <div className="space-y-1.5"><Label>Code</Label><Input value={editForm.code} onChange={(e) => setEditForm({ ...editForm, code: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Name</Label><Input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Price</Label><Input required type="number" step="0.01" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} /></div>
            <div className="flex items-center gap-2">
              <Switch id="svc-active" checked={editForm.active} onCheckedChange={(v) => setEditForm({ ...editForm, active: v })} />
              <Label htmlFor="svc-active" className="cursor-pointer">Show in billing (active)</Label>
            </div>
            <DialogFooter><Button type="submit">Save service</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
