import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function Settings() {
  const [s, setS] = useState<any>(null);

  useEffect(() => {
    supabase.from("store_settings").select("*").eq("id", 1).single().then(({ data }) => setS(data));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("store_settings").update({
      business_name: s.business_name, address: s.address, phone: s.phone, gstin: s.gstin,
      gst_default_on: s.gst_default_on, twilio_from_number: s.twilio_from_number, sms_enabled: s.sms_enabled,
    }).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
  };

  if (!s) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Business details, GST, and SMS notifications</p>
      </div>
      <form onSubmit={save} className="space-y-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Business info</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5"><Label>Business name</Label><Input value={s.business_name} onChange={(e) => setS({ ...s, business_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Address</Label><Input value={s.address} onChange={(e) => setS({ ...s, address: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Phone</Label><Input value={s.phone} onChange={(e) => setS({ ...s, phone: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>GSTIN</Label><Input value={s.gstin} onChange={(e) => setS({ ...s, gstin: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="g" checked={s.gst_default_on} onCheckedChange={(v) => setS({ ...s, gst_default_on: v })} />
              <Label htmlFor="g" className="cursor-pointer">Apply GST 18% by default on new bills</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">SMS notifications (Twilio)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Connect Twilio via the Lovable connector (chat: "connect Twilio") to enable thank-you SMS after each bill. The customer will receive their bill total and updated wallet balance.
            </div>
            <div className="space-y-1.5">
              <Label>Twilio sender number (E.164, e.g. +15017122661)</Label>
              <Input value={s.twilio_from_number ?? ""} onChange={(e) => setS({ ...s, twilio_from_number: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="sms" checked={s.sms_enabled} onCheckedChange={(v) => setS({ ...s, sms_enabled: v })} />
              <Label htmlFor="sms" className="cursor-pointer">Send thank-you SMS after each bill</Label>
            </div>
          </CardContent>
        </Card>

        <Button type="submit">Save settings</Button>
      </form>
    </div>
  );
}
