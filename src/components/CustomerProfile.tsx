import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { inr } from "@/lib/format";
import { format } from "date-fns";
import { Phone, Mail, Wallet } from "lucide-react";

interface Props { id: string; onClose: () => void }

export default function CustomerProfile({ id, onClose }: Props) {
  const [customer, setCustomer] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase.from("customers").select("*").eq("id", id).single();
      setCustomer(c);
      if (c?.plan_id) {
        const { data: p } = await supabase.from("plans").select("*").eq("id", c.plan_id).single();
        setPlan(p);
      } else setPlan(null);
      const { data: tx } = await supabase
        .from("transactions")
        .select("id,created_at,total,staff_name,cash_amount,upi_amount,wallet_amount,transaction_items(service_name,price,quantity)")
        .eq("customer_id", id)
        .order("created_at", { ascending: false });
      setHistory(tx ?? []);
    })();
  }, [id]);

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
                <div className="text-xs text-muted-foreground">Plan</div>
                <Badge variant={plan ? "default" : "secondary"}>{plan ? plan.name : "None"}</Badge>
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
                      {(t.transaction_items ?? []).map((i: any, idx: number) => (
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
    </Sheet>
  );
}
