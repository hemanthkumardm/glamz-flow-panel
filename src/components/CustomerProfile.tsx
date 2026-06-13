import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { inr } from "@/lib/format";
import { format } from "date-fns";
import { Phone, Mail, Wallet } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Props { id: string; onClose: () => void }

export default function CustomerProfile({ id, onClose }: Props) {
  const { user } = useAuth();
  const [customer, setCustomer] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [plans, setPlans] = useState<api.Plan[]>([]);
  
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  const load = async () => {
    try {
      const [c, p] = await Promise.all([api.getCustomer(id), api.getPlans()]);
      setCustomer(c.customer);
      setPlan(c.plan ?? null);
      setHistory(c.transactions ?? []);
      setPlans(p ?? []);
    } catch { }
  };

  useEffect(() => { load(); }, [id]);

  const handleUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newPlan = plans.find(p => p.id === selectedPlanId);
      if (!newPlan) return;
      await api.updateCustomerPlan(id, { plan_id: newPlan.id, wallet_addition: newPlan.credit_value });
      
      if (newPlan.price > 0) {
        await api.createTransaction({
          customer_id: id,
          staff_name: user?.full_name || "Admin",
          subtotal: newPlan.price,
          discount_pct: 0,
          discount_flat: 0,
          discount_amount: 0,
          gst_applied: false,
          cgst_amount: 0,
          sgst_amount: 0,
          total: newPlan.price,
          cash_amount: paymentMethod === "Cash" ? newPlan.price : 0,
          upi_amount: paymentMethod === "UPI" ? newPlan.price : 0,
          wallet_amount: 0,
          upi_txn_id: null,
          items: [{ service_id: null, service_name: `Membership: ${newPlan.name}`, price: newPlan.price, quantity: 1, staff_name: user?.full_name || "Admin" }]
        });
      }
      
      toast.success("Plan upgraded & logged!");
      setUpgradeOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (!customer) return null;
  const method = (t: any) => {
    const parts = [];
    if (t.cash_amount > 0) parts.push("Cash");
    if (t.upi_amount > 0) parts.push("UPI");
    if (t.wallet_amount > 0) parts.push("Wallet");
    return parts.join(" + ") || "—";
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">{customer.name}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Card><CardContent className="p-3 flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{customer.phone}</span></CardContent></Card>
            <Card><CardContent className="p-3 flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><span className="text-sm truncate">{customer.email ?? "—"}</span></CardContent></Card>
          </div>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-warning" />
                <div>
                  <div className="text-xs text-muted-foreground">Wallet balance</div>
                  <div className="text-xl font-semibold">{inr(customer.wallet_balance)}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground mb-1">Plan</div>
                <div className="flex items-center gap-2">
                  <Badge variant={plan ? "default" : "secondary"}>{plan ? plan.name : "None"}</Badge>
                  <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={() => setUpgradeOpen(true)}>Upgrade</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <div className="text-sm font-medium mb-2">Service history ({history.length})</div>
            <div className="space-y-2">
              {history.map((t) => (
                <Card key={t.id}>
                  <CardContent className="p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">{format(new Date(t.created_at), "dd MMM yyyy, HH:mm")}</div>
                      <div className="font-semibold">{inr(t.total)}</div>
                    </div>
                    <div className="mt-1.5 text-xs">
                      {(t.items ?? []).map((i: any, idx: number) => (
                        <div key={idx} className="flex justify-between">
                          <span>{i.service_name}{i.quantity > 1 ? ` × ${i.quantity}` : ""}</span>
                          <span className="text-muted-foreground">{inr(i.price * i.quantity)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>By {t.staff_name}</span>
                      <span>{method(t)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {history.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">No bills yet</div>}
            </div>
          </div>
        </div>
      </SheetContent>

      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upgrade Membership Plan</DialogTitle></DialogHeader>
          <form onSubmit={handleUpgrade} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Select New Plan</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId} required>
                <SelectTrigger><SelectValue placeholder="Choose a plan" /></SelectTrigger>
                <SelectContent>
                  {plans.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({inr(p.price)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPlanId && plans.find(p => p.id === selectedPlanId)?.price > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-dashed">
                <Label>Payment Method</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="pm" checked={paymentMethod === "Cash"} onChange={() => setPaymentMethod("Cash")} /> Cash
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="pm" checked={paymentMethod === "UPI"} onChange={() => setPaymentMethod("UPI")} /> UPI
                  </label>
                </div>
              </div>
            )}

            <DialogFooter><Button type="submit">Complete Upgrade</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
