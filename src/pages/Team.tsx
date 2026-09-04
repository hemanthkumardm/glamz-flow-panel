import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PlusCircle, UserPlus, Calendar, History } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, startOfDay, endOfDay } from "date-fns";
import { inr } from "@/lib/format";

export default function Team() {
  const [members, setMembers] = useState<any[]>([]);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: "", phone: "", pass: "" });
  const [busy, setBusy] = useState(false);
  const [logStaff, setLogStaff] = useState<any>(null);
  const [logDate, setLogDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [logTx, setLogTx] = useState<any[]>([]);
  const [logLoading, setLogLoading] = useState(false);

  const load = async () => {
    try {
      const data = await api.getTeamMembers();
      setMembers(data ?? []);
    } catch { }
  };
  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.register(f.phone, f.pass, f.name);
      toast.success("Team member added!");
      setAdding(false);
      setF({ name: "", phone: "", pass: "" });
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add member");
    } finally {
      setBusy(false);
    }
  };

  const demoteToStaff = async (uid: string) => {
    try {
      await api.setMemberRole(uid, "staff");
      toast.success("Demoted to staff");
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update role");
    }
  };

  const staffMatches = (staffName: string | null | undefined, member: any) => {
    if (!staffName) return false;
    const name = member.full_name?.trim();
    const phone = member.phone?.trim();
    return staffName === name || (!!phone && staffName === phone);
  };

  useEffect(() => {
    if (!logStaff || !logDate) return;
    (async () => {
      setLogLoading(true);
      try {
        const start = startOfDay(new Date(logDate)).toISOString();
        const end = endOfDay(new Date(logDate)).toISOString();
        const tx = await api.getTransactions({ from: start, to: end });
        setLogTx(tx ?? []);
      } catch { } finally {
        setLogLoading(false);
      }
    })();
  }, [logStaff, logDate]);

  // Filter transactions and items for the selected staff member
  const staffItems = logTx.filter((t) => !t.voided_at).flatMap(t => {
    const matchingItems = (t.items || []).filter((it: any) => staffMatches(it.staff_name, logStaff));
    return matchingItems.map((it: any) => ({
      ...it,
      transaction_id: t.id,
      customer_name: t.customer_name || "Walk-in",
      created_at: t.created_at
    }));
  });

  const staffTotal = staffItems.reduce((sum, it) => sum + (it.price * it.quantity), 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground">Manage your salon staff and administrators here.</p>
        </div>
        <Button onClick={() => setAdding(!adding)} variant={adding ? "ghost" : "default"} size="sm">
          {adding ? "Cancel" : <><UserPlus className="h-4 w-4 mr-2" /> Add Member</>}
        </Button>
      </div>

      {adding && (
        <Card className="animate-in slide-in-from-top-4 duration-300">
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <PlusCircle className="h-5 w-5 text-primary" />
            <CardTitle className="text-base text-primary uppercase font-bold tracking-wider">New Staff Account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-1.5">
                <Label className="text-[10px]">Full Name</Label>
                <Input required placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px]">Phone Number</Label>
                <Input required placeholder="Phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px]">Password</Label>
                <Input required type="password" placeholder="Password" value={f.pass} onChange={(e) => setF({ ...f, pass: e.target.value })} />
              </div>
              <div className="pt-2 sm:pt-0">
                <Button type="submit" disabled={busy} className="w-full">
                  {busy ? "Wait..." : "Create Account"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Members ({members.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="text-xs"><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Role</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id} className="text-sm">
                  <TableCell className="font-medium">{m.full_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{m.phone ?? "—"}</TableCell>
                  <TableCell><Badge variant={m.role === "admin" ? "default" : "secondary"}>{m.role}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setLogStaff(m)}>
                        <History className="h-4 w-4 mr-1.5" /> Log
                      </Button>
                      {m.role === "admin" && (
                        <Button size="sm" variant="outline" onClick={() => demoteToStaff(m.id)}>
                          Demote to Staff
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!logStaff} onOpenChange={(open) => !open && setLogStaff(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Work Log: {logStaff?.full_name || "Staff"}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 py-2 border-b">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input 
              type="date" 
              className="w-[160px] h-8 text-sm" 
              value={logDate} 
              onChange={(e) => setLogDate(e.target.value)} 
            />
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {logLoading ? (
              <div className="text-center py-10 text-sm text-muted-foreground">Loading...</div>
            ) : staffItems.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>Time</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffItems.map((it, i) => (
                    <TableRow key={i} className="text-sm">
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {format(new Date(it.created_at), "hh:mm a")}
                      </TableCell>
                      <TableCell>{it.customer_name}</TableCell>
                      <TableCell>{it.service_name} {it.quantity > 1 ? `(x${it.quantity})` : ""}</TableCell>
                      <TableCell className="text-right font-medium">{inr(it.price * it.quantity)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-10 text-sm text-muted-foreground">
                No work logged for this date.
              </div>
            )}
          </div>
          <div className="pt-4 border-t flex justify-between items-center bg-muted/20 px-4 py-3 rounded-md mt-2">
            <span className="text-sm font-medium text-muted-foreground">Total Revenue Generated:</span>
            <span className="text-xl font-bold text-primary">{inr(staffTotal)}</span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
