import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { inr, computeTotals } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Search, X, Plus, Receipt as ReceiptIcon } from "lucide-react";
import ReceiptModal from "@/components/ReceiptModal";
import { ReceiptData } from "@/lib/receipt";

interface Customer { id: string; name: string; phone: string; wallet_balance: number }
interface Service { id: string; code: string | null; name: string; price: number }
interface CartItem { service_id: string | null; service_name: string; price: number; quantity: number }

export default function Billing() {
  const { user, fullName } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<any>(null);

  const [custQ, setCustQ] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [svcQ, setSvcQ] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  const [discountPct, setDiscountPct] = useState("0");
  const [discountFlat, setDiscountFlat] = useState("0");
  const [gstApplied, setGstApplied] = useState(true);

  const [cash, setCash] = useState("0");
  const [upi, setUpi] = useState("0");
  const [wallet, setWallet] = useState("0");
  const [upiTxn, setUpiTxn] = useState("");

  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  useEffect(() => {
    (async () => {
      const [c, s, st] = await Promise.all([
        supabase.from("customers").select("id,name,phone,wallet_balance").order("name"),
        supabase.from("services").select("*").eq("active", true).order("name"),
        supabase.from("store_settings").select("*").eq("id", 1).single(),
      ]);
      setCustomers((c.data as Customer[]) ?? []);
      setServices((s.data as Service[]) ?? []);
      setSettings(st.data);
      setGstApplied(st.data?.gst_default_on ?? true);
    })();
  }, []);

  const totals = useMemo(
    () => computeTotals(cart, Number(discountPct) || 0, Number(discountFlat) || 0, gstApplied),
    [cart, discountPct, discountFlat, gstApplied]
  );

  const paid = (Number(cash) || 0) + (Number(upi) || 0) + (Number(wallet) || 0);
  const remaining = +(totals.total - paid).toFixed(2);

  const filteredCustomers = customers.filter((c) =>
    !custQ || c.name.toLowerCase().includes(custQ.toLowerCase()) || c.phone.includes(custQ)
  ).slice(0, 6);

  const filteredServices = services.filter((s) =>
    !svcQ || s.name.toLowerCase().includes(svcQ.toLowerCase()) || (s.code ?? "").toLowerCase().includes(svcQ.toLowerCase())
  ).slice(0, 6);

  const addService = (s: Service) => {
    setCart((prev) => {
      const ex = prev.find((p) => p.service_id === s.id);
      if (ex) return prev.map((p) => p === ex ? { ...p, quantity: p.quantity + 1 } : p);
      return [...prev, { service_id: s.id, service_name: s.name, price: s.price, quantity: 1 }];
    });
    setSvcQ("");
  };

  const submit = async () => {
    if (!selectedCustomer) return toast.error("Select a customer");
    if (cart.length === 0) return toast.error("Add at least one service");
    if (Math.abs(remaining) > 0.01) return toast.error(`Payment mismatch: ${inr(remaining)} remaining`);
    if (Number(wallet) > selectedCustomer.wallet_balance) return toast.error("Wallet balance insufficient");
    if (Number(upi) > 0 && !upiTxn.trim()) return toast.error("UPI Transaction ID required");

    setBusy(true);
    const txPayload = {
      customer_id: selectedCustomer.id,
      staff_id: user!.id,
      staff_name: fullName || user!.email!,
      subtotal: totals.subtotal,
      discount_pct: Number(discountPct) || 0,
      discount_flat: Number(discountFlat) || 0,
      discount_amount: totals.discount_amount,
      gst_applied: gstApplied,
      cgst_amount: totals.cgst,
      sgst_amount: totals.sgst,
      total: totals.total,
      cash_amount: Number(cash) || 0,
      upi_amount: Number(upi) || 0,
      wallet_amount: Number(wallet) || 0,
      upi_txn_id: upiTxn || null,
    };
    const { data: tx, error } = await supabase.from("transactions").insert(txPayload).select().single();
    if (error || !tx) { setBusy(false); return toast.error(error?.message ?? "Failed"); }

    const items = cart.map((c) => ({ ...c, transaction_id: tx.id }));
    const { error: ie } = await supabase.from("transaction_items").insert(items);
    if (ie) { setBusy(false); return toast.error(ie.message); }

    // SMS notification (fire-and-forget)
    if (settings?.sms_enabled) {
      supabase.functions.invoke("send-bill-sms", {
        body: {
          phone: selectedCustomer.phone,
          customerName: selectedCustomer.name,
          total: totals.total,
          walletAfter: tx.wallet_balance_after ?? selectedCustomer.wallet_balance - (Number(wallet) || 0),
        },
      }).catch(() => {});
    }

    toast.success("Bill created");
    setReceipt({
      business: {
        name: settings?.business_name ?? "S M Glamz",
        address: settings?.address ?? "",
        phone: settings?.phone ?? "",
        gstin: settings?.gstin ?? "",
      },
      txId: tx.id,
      createdAt: tx.created_at,
      customer: { name: selectedCustomer.name, phone: selectedCustomer.phone },
      staffName: fullName || user!.email!,
      items: cart,
      subtotal: totals.subtotal,
      discount: totals.discount_amount,
      cgst: totals.cgst,
      sgst: totals.sgst,
      total: totals.total,
      cash: Number(cash) || 0,
      upi: Number(upi) || 0,
      wallet: Number(wallet) || 0,
      upiTxnId: upiTxn || null,
      walletAfter: tx.wallet_balance_after,
    });
    setBusy(false);
  };

  const reset = () => {
    setSelectedCustomer(null); setCart([]); setDiscountFlat("0"); setDiscountPct("0");
    setCash("0"); setUpi("0"); setWallet("0"); setUpiTxn("");
    setReceipt(null);
    // refresh customer wallet
    supabase.from("customers").select("id,name,phone,wallet_balance").order("name").then(({ data }) => setCustomers((data as Customer[]) ?? []));
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">Create new bill · Staff: {fullName || "—"}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Customer</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {selectedCustomer ? (
                <div className="flex items-center justify-between bg-accent rounded-md p-3">
                  <div>
                    <div className="font-medium">{selectedCustomer.name}</div>
                    <div className="text-xs text-muted-foreground">{selectedCustomer.phone} · Wallet: {inr(selectedCustomer.wallet_balance)}</div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedCustomer(null)}><X className="h-4 w-4" /></Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9 h-9" placeholder="Search customer by name or phone…" value={custQ} onChange={(e) => setCustQ(e.target.value)} />
                  </div>
                  {custQ && (
                    <div className="border rounded-md divide-y">
                      {filteredCustomers.map((c) => (
                        <button key={c.id} type="button" onClick={() => { setSelectedCustomer(c); setCustQ(""); }} className="w-full text-left px-3 py-2 hover:bg-secondary text-sm">
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground">{c.phone} · Wallet: {inr(c.wallet_balance)}</div>
                        </button>
                      ))}
                      {filteredCustomers.length === 0 && <div className="px-3 py-3 text-xs text-muted-foreground">No matches</div>}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Services</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9 h-9" placeholder="Search service by name or code…" value={svcQ} onChange={(e) => setSvcQ(e.target.value)} />
              </div>
              {svcQ && (
                <div className="border rounded-md divide-y">
                  {filteredServices.map((s) => (
                    <button key={s.id} type="button" onClick={() => addService(s)} className="w-full text-left px-3 py-2 hover:bg-secondary text-sm flex items-center justify-between">
                      <div>
                        <span className="font-medium">{s.name}</span>
                        {s.code && <Badge variant="outline" className="ml-2 text-[10px]">{s.code}</Badge>}
                      </div>
                      <span className="text-muted-foreground">{inr(s.price)}</span>
                    </button>
                  ))}
                  {filteredServices.length === 0 && <div className="px-3 py-3 text-xs text-muted-foreground">No matches. Add services in Settings → Plans page.</div>}
                </div>
              )}

              <Table>
                <TableBody>
                  {cart.map((it, idx) => (
                    <TableRow key={idx} className="text-sm">
                      <TableCell className="font-medium">{it.service_name}</TableCell>
                      <TableCell className="w-24">
                        <Input type="number" min={1} className="h-7" value={it.quantity}
                          onChange={(e) => setCart((p) => p.map((x, i) => i === idx ? { ...x, quantity: Math.max(1, Number(e.target.value)) } : x))} />
                      </TableCell>
                      <TableCell className="w-28">
                        <Input type="number" step="0.01" className="h-7" value={it.price}
                          onChange={(e) => setCart((p) => p.map((x, i) => i === idx ? { ...x, price: Number(e.target.value) } : x))} />
                      </TableCell>
                      <TableCell className="text-right w-24">{inr(it.price * it.quantity)}</TableCell>
                      <TableCell className="w-10">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCart((p) => p.filter((_, i) => i !== idx))}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {cart.length === 0 && <TableRow><TableCell className="text-sm text-muted-foreground text-center py-6">No services added</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Discount &amp; GST</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-3 gap-3 items-end">
              <div className="space-y-1.5"><Label>Discount %</Label><Input type="number" step="0.01" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Flat discount</Label><Input type="number" step="0.01" value={discountFlat} onChange={(e) => setDiscountFlat(e.target.value)} /></div>
              <div className="flex items-center gap-2 pb-2">
                <Switch id="gst" checked={gstApplied} onCheckedChange={setGstApplied} />
                <Label htmlFor="gst" className="cursor-pointer">Apply GST 18%</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Payment split</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Cash</Label><Input type="number" step="0.01" value={cash} onChange={(e) => setCash(e.target.value)} /></div>
              <div className="space-y-1.5">
                <Label>UPI</Label>
                <Input type="number" step="0.01" value={upi} onChange={(e) => setUpi(e.target.value)} />
                {Number(upi) > 0 && <Input className="mt-2" placeholder="UPI Transaction ID" value={upiTxn} onChange={(e) => setUpiTxn(e.target.value)} />}
              </div>
              <div className="space-y-1.5">
                <Label>Wallet {selectedCustomer && <span className="text-xs text-muted-foreground">(avail: {inr(selectedCustomer.wallet_balance)})</span>}</Label>
                <Input type="number" step="0.01" value={wallet} onChange={(e) => setWallet(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-4">
            <CardHeader className="pb-2"><CardTitle className="text-base">Bill summary</CardTitle></CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <Row label="Subtotal" v={inr(totals.subtotal)} />
              <Row label="Discount" v={"- " + inr(totals.discount_amount)} muted />
              {gstApplied && <>
                <Row label="CGST (9%)" v={inr(totals.cgst)} muted />
                <Row label="SGST (9%)" v={inr(totals.sgst)} muted />
              </>}
              <div className="border-t pt-2 mt-2">
                <Row label="TOTAL" v={inr(totals.total)} bold />
              </div>
              <div className="border-t pt-2 mt-2">
                <Row label="Paid" v={inr(paid)} muted />
                <Row label="Remaining" v={inr(remaining)} bold className={Math.abs(remaining) > 0.01 ? "text-destructive" : "text-success"} />
              </div>
              <Button className="w-full mt-3" disabled={busy} onClick={submit}>
                <ReceiptIcon className="h-4 w-4 mr-1.5" />
                {busy ? "Processing…" : "Complete payment"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={reset}>Reset</Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {receipt && <ReceiptModal data={receipt} onClose={reset} />}
    </div>
  );
}

function Row({ label, v, bold, muted, className = "" }: any) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""} ${muted ? "text-muted-foreground" : ""} ${className}`}>
      <span>{label}</span><span>{v}</span>
    </div>
  );
}
