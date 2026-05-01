import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PlusCircle, UserPlus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Team() {
  const [members, setMembers] = useState<any[]>([]);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: "", phone: "", pass: "", role: "staff" as "admin" | "staff" });
  const [busy, setBusy] = useState(false);

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
      await api.register(f.phone, f.pass, f.name, f.role);
      toast.success("Team member added!");
      setAdding(false);
      setF({ name: "", phone: "", pass: "", role: "staff" });
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add member");
    } finally {
      setBusy(false);
    }
  };

  const toggleRole = async (uid: string, current: string) => {
    const newRole = current === "admin" ? "staff" : "admin";
    try {
      await api.setMemberRole(uid, newRole as "admin" | "staff");
      load();
    } catch { }
  };

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
            <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
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
              <div className="space-y-1.5">
                <Label className="text-[10px]">Role</Label>
                <Select value={f.role} onValueChange={(v: any) => setF({ ...f, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
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
                    <Button size="sm" variant="outline" onClick={() => toggleRole(m.id, m.role)}>
                      {m.role === "admin" ? "Demote to staff" : "Promote to admin"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
