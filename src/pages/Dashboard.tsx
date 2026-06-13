import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { inr } from "@/lib/format";
import { Banknote, Smartphone, Wallet, Receipt, FileText } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { format, startOfDay, subDays } from "date-fns";

export default function Dashboard() {
  const [todayTx, setTodayTx] = useState<api.Transaction[]>([]);
  const [weekTx, setWeekTx] = useState<api.Transaction[]>([]);
  const [allTx, setAllTx] = useState<any[]>([]);
  const [showBills, setShowBills] = useState(false);

  const load = () => {
    const todayStart = startOfDay(new Date()).toISOString();
    const weekStart = startOfDay(subDays(new Date(), 6)).toISOString();
    Promise.all([
      api.getTransactions({ from: todayStart }),
      api.getTransactions({ from: weekStart }),
      api.getTransactions(),
    ]).then(([t, w, a]) => {
      setTodayTx(t ?? []);
      setWeekTx(w ?? []);
      setAllTx(a ?? []);
    }).catch(() => { });
  };

  useEffect(() => { load(); }, []);

  const sum = (arr: api.Transaction[], k: keyof api.Transaction) =>
    arr.reduce((s, t) => s + Number(t[k] || 0), 0);
  const cash = sum(todayTx, "cash_amount");
  const upi = sum(todayTx, "upi_amount");
  const wallet = sum(todayTx, "wallet_amount");
  const totalToday = sum(todayTx, "total");

  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = startOfDay(subDays(new Date(), 6 - i));
    const key = format(d, "yyyy-MM-dd");
    const day = weekTx.filter((t) => format(new Date(t.created_at), "yyyy-MM-dd") === key);
    return { day: format(d, "EEE"), revenue: sum(day, "total") };
  });

  const pieData = [
    { name: "Cash", value: cash, color: "hsl(142 71% 45%)" },
    { name: "UPI", value: upi, color: "hsl(217 91% 60%)" },
    { name: "Wallet", value: wallet, color: "hsl(38 92% 50%)" },
  ].filter((d) => d.value > 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Today's shift summary &amp; weekly trends</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowBills(true)}>
          <FileText className="h-4 w-4 mr-2" />
          View All Bills
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={Receipt} label="Today's Revenue" value={inr(totalToday)} hint={`${todayTx.length} bills`} />
        <Stat icon={Banknote} label="Cash" value={inr(cash)} accent="success" />
        <Stat icon={Smartphone} label="UPI" value={inr(upi)} accent="primary" />
        <Stat icon={Wallet} label="Wallet" value={inr(wallet)} accent="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">Revenue · Last 7 days</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={days}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => inr(v)}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Payment split · Today</CardTitle></CardHeader>
          <CardContent className="h-72">
            {pieData.length === 0 ? (
              <div className="h-full grid place-items-center text-sm text-muted-foreground">No payments yet today</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => inr(v)} contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showBills} onOpenChange={setShowBills}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Billing Records</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Staff (Team)</TableHead>
                <TableHead>Services</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allTx.map((tx) => (
                <TableRow key={tx.id} className="text-sm font-light">
                  <TableCell className="whitespace-nowrap">{format(new Date(tx.created_at), "dd MMM, hh:mm a")}</TableCell>
                  <TableCell className="font-medium">
                    {tx.customer_name ? (
                      tx.customer_name
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-normal border-dashed">
                        Walk-in
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{tx.staff_name || "—"}</TableCell>
                  <TableCell className="max-w-[200px]">
                    <div className="text-[11px] leading-tight text-muted-foreground">
                      {tx.items?.map((it: any) => `${it.service_name} (x${it.quantity})${it.staff_name ? ` - [${it.staff_name}]` : ''}`).join(", ")}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{inr(tx.total)}</TableCell>
                </TableRow>
              ))}
              {allTx.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No bills found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint, accent }: any) {
  const colors: any = {
    success: "text-emerald-600 bg-emerald-50",
    primary: "text-blue-600 bg-blue-50",
    warning: "text-amber-600 bg-amber-50",
  };
  return (
    <Card className="shadow-none border-dashed">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${accent ? colors[accent] : "bg-secondary text-secondary-foreground"}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
          <div className="text-lg font-bold">{value}</div>
          {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
