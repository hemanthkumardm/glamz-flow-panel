import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { inr } from "@/lib/format";
import { Banknote, Smartphone, Wallet, Receipt } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { format, startOfDay, subDays } from "date-fns";

interface Tx {
  created_at: string;
  total: number;
  cash_amount: number;
  upi_amount: number;
  wallet_amount: number;
}

export default function Dashboard() {
  const [todayTx, setTodayTx] = useState<Tx[]>([]);
  const [weekTx, setWeekTx] = useState<Tx[]>([]);

  useEffect(() => {
    const todayStart = startOfDay(new Date()).toISOString();
    const weekStart = startOfDay(subDays(new Date(), 6)).toISOString();
    Promise.all([
      supabase.from("transactions").select("created_at,total,cash_amount,upi_amount,wallet_amount").gte("created_at", todayStart),
      supabase.from("transactions").select("created_at,total,cash_amount,upi_amount,wallet_amount").gte("created_at", weekStart),
    ]).then(([t, w]) => {
      setTodayTx((t.data as Tx[]) ?? []);
      setWeekTx((w.data as Tx[]) ?? []);
    });
  }, []);

  const sum = (arr: Tx[], k: keyof Tx) => arr.reduce((s, t) => s + Number(t[k] || 0), 0);
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Today's shift summary &amp; weekly trends</p>
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
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint, accent = "primary" }: any) {
  const ring: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-md grid place-items-center ${ring[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-lg font-semibold truncate">{value}</div>
          {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
