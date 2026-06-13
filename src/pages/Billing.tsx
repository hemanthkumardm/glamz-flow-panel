import { useEffect, useMemo, useState } from "react";
import * as api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { inr, computeTotals } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Search, X, Plus, Receipt as ReceiptIcon, Banknote, Smartphone, Wallet as WalletIcon, User } from "lucide-react";
import ReceiptModal from "@/components/ReceiptModal";
import { ReceiptData } from "@/lib/receipt";

interface CartItem { service_id: string | null; service_name: string; price: number; quantity: number; staff_name?: string; }

export default function Billing() {
  const { user, fullName } = useAuth();
  const [customers, setCustomers] = useState<api.Customer[]>([]);
  const [services, setServices] = useState<api.Service[]>([]);
  const [settings, setSettings] = useState<api.StoreSettings | null>(null);
  const [team, setTeam] = useState<any[]>([]);

  const [isWalkIn, setIsWalkIn] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [custQ, setCustQ] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<api.Customer | null>(null);

  const [svcQ, setSvcQ] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  const [discountPct, setDiscountPct] = useState("0");
  const [discountFlat, setDiscountFlat] = useState("0");
  const [gstApplied, setGstApplied] = useState(true);

  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "wallet" | "split">("cash");
  const [cash, setCash] = useState("0");
  const [upi, setUpi] = useState("0");
  const [wallet, setWallet] = useState("0");
  const [upiTxn, setUpiTxn] = useState("");

  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [c, s, st, tm] = await Promise.all([
          api.getCustomers(),
          api.getServices(true),
          api.getSettings(),
          api.getTeamMembers(),
        ]);
        setCustomers(c ?? []);
        setServices(s ?? []);
        setSettings(st);
        setTeam(tm ?? []);
        setGstApplied(st?.gst_default_on ?? true);
      } catch { }
    })();
  }, []);

  useEffect(() => {
    if (selectedCustomer?.plan_id) {
      setDiscountPct("10");
      toast.success("10% Member Discount Applied Automatically!");
    } else {
      setDiscountPct("0");
    }
  }, [selectedCustomer]);

  const totals = useMemo(
    () => computeTotals(cart, Number(discountPct) || 0, Number(discountFlat) || 0, gstApplied),
    [cart, discountPct, discountFlat, gstApplied]
  );

  useEffect(() => {
    if (paymentMethod === "cash") {
      setCash(totals.total.toString()); setUpi("0"); setWallet("0");
    } else if (paymentMethod === "upi") {
      setCash("0"); setUpi(totals.total.toString()); setWallet("0");
    } else if (paymentMethod === "wallet") {
      if (isWalkIn) {
        setPaymentMethod("cash");
      } else {
        setCash("0"); setUpi("0"); setWallet(totals.total.toString());
      }
    }
  }, [paymentMethod, totals.total, isWalkIn]);

  const paid = (Number(cash) || 0) + (Number(upi) || 0) + (Number(wallet) || 0);
  const remaining = +(totals.total - paid).toFixed(2);

  const filteredCustomers = customers.filter((c) =>
    !custQ || c.name.toLowerCase().includes(custQ.toLowerCase()) || c.phone.includes(custQ)
  ).slice(0, 6);

  const filteredServices = services.filter((s) =>
    !svcQ || s.name.toLowerCase().includes(svcQ.toLowerCase()) || (s.code ?? "").toLowerCase().includes(svcQ.toLowerCase())
  ).slice(0, 6);

  const addService = (s: api.Service) => {
    setCart((prev) => {
      // In this simple mode, we just add it, potentially multiple times as separate lines if quantity is 1
      return [...prev, { service_id: s.id, service_name: s.name, price: s.price, quantity: 1 }];
    });
    setSvcQ("");
  };

  const submit = async () => {
    if (isWalkIn && !guestName.trim()) return toast.error("Guest name is mandatory for walk-ins");
    if (!isWalkIn && !selectedCustomer) return toast.error("Select a customer or use Walk-in");
    if (cart.length === 0) return toast.error("Add at least one service");
    if (Math.abs(remaining) > 0.01) return toast.error(`Payment mismatch: ${inr(remaining)} remaining`);
    if (!isWalkIn && selectedCustomer && Number(wallet) > selectedCustomer.wallet_balance) {
      return toast.error("Wallet balance insufficient");
    }
    if (Number(upi) > 0 && !upiTxn.trim()) return toast.error("UPI Transaction ID required");

    setBusy(true);
    try {
      const tx = await api.createTransaction({
        customer_id: isWalkIn ? null : selectedCustomer?.id,
        customer_name: isWalkIn ? guestName : null,
        customer_phone: isWalkIn ? guestPhone : null,
        staff_name: fullName || user?.phone || "",
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
        items: cart.map((c) => ({ service_id: c.service_id, service_name: c.service_name, price: c.price, quantity: c.quantity, staff_name: c.staff_name })),
      });

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
        customer: { name: isWalkIn ? (guestName || "Walk-in") : (selectedCustomer?.name ?? ""), phone: isWalkIn ? guestPhone : (selectedCustomer?.phone ?? "") },
        staffName: fullName || user?.phone || "",
        items: cart.map((c) => ({ name: c.service_name, price: c.price, quantity: c.quantity })),
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
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setSelectedCustomer(null); setIsWalkIn(false); setGuestName("");
    setGuestPhone("");
    setCart([]);
    setDiscountFlat("0"); setDiscountPct("0");
    setCash("0"); setUpi("0"); setWallet("0"); setUpiTxn("");
    setPaymentMethod("cash");
    setReceipt(null);
    try {
      const c = await api.getCustomers();
      setCustomers(c ?? []);
    } catch { }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
          <p className="text-sm text-muted-foreground">Create new bill · Staff: {fullName || "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer Info
              </CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="walkin" className="text-xs font-medium cursor-pointer">Walk-in Guest</Label>
                <Switch id="walkin" checked={isWalkIn} onCheckedChange={(v) => { setIsWalkIn(v); if (v) setSelectedCustomer(null); }} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isWalkIn ? (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <div className="space-y-2">
                    <Label className="text-[10px] text-primary uppercase font-bold">Guest Name (Mandatory)</Label>
                    <Input required placeholder="Enter guest name..." value={guestName} onChange={(e) => setGuestName(e.target.value)} className="h-9 border-primary/30" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] text-primary uppercase font-bold">Guest Phone (Optional)</Label>
                    <Input placeholder="Enter phone number..." value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} className="h-9 border-primary/30" />
                  </div>
                </div>
              ) : selectedCustomer ? (
                <div className="flex items-center justify-between bg-accent/50 rounded-md p-3 border border-dashed animate-in zoom-in-95 duration-200">
                  <div>
                    <div className="font-semibold text-sm">{selectedCustomer.name}</div>
                    <div className="text-xs text-muted-foreground">{selectedCustomer.phone} · Wallet: {inr(selectedCustomer.wallet_balance)}</div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedCustomer(null)}><X className="h-4 w-4" /></Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9 h-9" placeholder="Search regular customer..." value={custQ} onChange={(e) => setCustQ(e.target.value)} />
                  </div>
                  {custQ && (
                    <div className="border rounded-md divide-y overflow-hidden translate-y-1">
                      {filteredCustomers.map((c) => (
                        <button key={c.id} type="button" onClick={() => { setSelectedCustomer(c); setCustQ(""); }} className="w-full text-left px-3 py-2 hover:bg-secondary text-sm">
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground">{c.phone} · {inr(c.wallet_balance)}</div>
                        </button>
                      ))}
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
                <Input className="pl-9 h-9 border-muted-foreground/20" placeholder="Quick add service…" value={svcQ} onChange={(e) => setSvcQ(e.target.value)} />
              </div>
              {svcQ && (
                <div className="border rounded-md divide-y overflow-hidden translate-y-1">
                  {filteredServices.map((s) => (
                    <button key={s.id} type="button" onClick={() => addService(s)} className="w-full text-left px-3 py-2 hover:bg-secondary text-sm flex items-center justify-between group">
                      <div>
                        <span className="font-medium group-hover:text-primary transition-colors">{s.name}</span>
                        {s.code && <Badge variant="outline" className="ml-2 py-0 h-4 text-[9px] uppercase">{s.code}</Badge>}
                      </div>
                      <span className="text-muted-foreground font-medium">{inr(s.price)}</span>
                    </button>
                  ))}
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/30">
                    <TableHead className="pl-4">Service</TableHead>
                    <TableHead className="w-32">Staff</TableHead>
                    <TableHead className="text-right pr-4">Cost</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.map((it, idx) => (
                    <TableRow key={idx} className="text-sm hover:bg-transparent border-b-muted/50">
                      <TableCell className="font-medium py-3 pl-4">{it.service_name}</TableCell>
                      <TableCell className="py-3">
                        <select
                          className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          value={it.staff_name || ""}
                          onChange={(e) => {
                            const newCart = [...cart];
                            newCart[idx].staff_name = e.target.value;
                            setCart(newCart);
                          }}
                        >
                          <option value="">Select...</option>
                          {team.map(member => (
                            <option key={member.id} value={member.full_name || member.phone}>
                              {member.full_name || member.phone}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell className="text-right py-3 pr-4 font-bold text-primary">
                        {inr(it.price)}
                      </TableCell>
                      <TableCell className="w-12 py-3 text-right pr-4">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => setCart((p) => p.filter((_, i) => i !== idx))}>
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {cart.length === 0 && <TableRow><TableCell colSpan={4} className="text-sm text-muted-foreground text-center py-10 opacity-60">Add services using the search bar above</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base text-primary">Payment Selection {isWalkIn && <span className="text-xs text-muted-foreground font-normal ml-2">(Wallet disabled for walk-ins)</span>}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                <TabsList className="grid grid-cols-4 w-full h-12">
                  <TabsTrigger value="cash" className="gap-2 h-10"><Banknote className="h-4 w-4" /> Cash</TabsTrigger>
                  <TabsTrigger value="upi" className="gap-2 h-10"><Smartphone className="h-4 w-4" /> UPI</TabsTrigger>
                  <TabsTrigger value="wallet" disabled={isWalkIn} className="gap-2 h-10"><WalletIcon className="h-4 w-4" /> Wallet</TabsTrigger>
                  <TabsTrigger value="split" className="gap-2 h-10">Split/Other</TabsTrigger>
                </TabsList>
              </Tabs>

              {paymentMethod === "upi" && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  <Label className="text-xs text-muted-foreground">Transaction ID (Required)</Label>
                  <Input placeholder="Enter UPI Txn ID" value={upiTxn} onChange={(e) => setUpiTxn(e.target.value)} />
                </div>
              )}

              {paymentMethod === "split" && (
                <div className="grid grid-cols-3 gap-3 pt-2 animate-in fade-in duration-300">
                  <div className="space-y-1.5"><Label className="text-xs">Cash Amt</Label><Input type="number" value={cash} onChange={(e) => setCash(e.target.value)} /></div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-blue-600">UPI Amt</Label>
                    <Input type="number" value={upi} onChange={(e) => setUpi(e.target.value)} />
                    {Number(upi) > 0 && <Input className="mt-1.5" placeholder="Txn ID" value={upiTxn} onChange={(e) => setUpiTxn(e.target.value)} />}
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs">Wallet Amt</Label><Input type="number" disabled={isWalkIn} value={wallet} onChange={(e) => setWallet(e.target.value)} /></div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground px-1 border-t pt-3">
                <span>Selected: <span className="capitalize font-semibold text-foreground">{paymentMethod === "split" ? "Mixed Payment" : paymentMethod}</span></span>
                <span>Paying: <span className="font-bold text-foreground">{inr(paid)}</span></span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-4 overflow-hidden border-2 border-primary/20">
            <CardHeader className="bg-primary/5 pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ReceiptIcon className="h-5 w-5" />
                Calculation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-sm">
              <Row label="Subtotal" v={inr(totals.subtotal)} />
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Discount %</Label>
                  <Input type="number" className="h-8" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Flat (₹)</Label>
                  <Input type="number" className="h-8" value={discountFlat} onChange={(e) => setDiscountFlat(e.target.value)} />
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-y border-dashed">
                <Label htmlFor="gst-toggle" className="text-xs font-medium">Add 5% GST</Label>
                <Switch id="gst-toggle" checked={gstApplied} onCheckedChange={setGstApplied} />
              </div>

              {gstApplied && (
                <div className="space-y-1 opacity-80">
                  <Row label="CGST (2.5%)" v={inr(totals.cgst)} muted />
                  <Row label="SGST (2.5%)" v={inr(totals.sgst)} muted />
                </div>
              )}

              <div className="pt-2">
                <div className="flex justify-between items-center px-3 py-2 bg-primary text-primary-foreground rounded-lg shadow-inner">
                  <span className="font-bold">TOTAL</span>
                  <span className="text-xl font-black">{inr(totals.total)}</span>
                </div>
              </div>

              <div className="pt-2 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Paid:</span>
                  <span className="font-medium">{inr(paid)}</span>
                </div>
                {Math.abs(remaining) > 0.01 && (
                  <div className="flex justify-between text-destructive font-bold animate-pulse">
                    <span>Due Balance:</span>
                    <span>{inr(remaining)}</span>
                  </div>
                )}
              </div>

              <Button className="w-full mt-4 h-12 text-base font-bold shadow-lg" disabled={busy || Math.abs(remaining) > 0.01} onClick={submit}>
                <ReceiptIcon className="h-5 w-5 mr-2" />
                {busy ? "Processing…" : "Finish Bill"}
              </Button>
              <Button variant="ghost" className="w-full text-xs h-8 text-muted-foreground" onClick={reset}>Reset Cart</Button>
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
