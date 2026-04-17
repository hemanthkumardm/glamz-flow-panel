import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Team() {
  const [members, setMembers] = useState<any[]>([]);

  const load = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at");
    const { data: roles } = await supabase.from("user_roles").select("user_id,role");
    const map = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
    setMembers((profiles ?? []).map((p) => ({ ...p, role: map.get(p.id) ?? "staff" })));
  };
  useEffect(() => { load(); }, []);

  const toggleRole = async (uid: string, current: string) => {
    if (current === "admin") {
      await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", "admin");
      await supabase.from("user_roles").insert({ user_id: uid, role: "staff" });
    } else {
      await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", "staff");
      await supabase.from("user_roles").insert({ user_id: uid, role: "admin" });
    }
    load();
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground">New team members sign up themselves on the login page; promote/demote here.</p>
      </div>
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
