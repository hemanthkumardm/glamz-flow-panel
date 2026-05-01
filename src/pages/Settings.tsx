import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function Settings() {
  const [s, setS] = useState<api.StoreSettings | null>(null);

  useEffect(() => {
    api.getSettings().then((data) => setS(data)).catch(() => { });
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!s) return;
    try {
      await api.saveSettings(s);
      toast.success("Settings saved");
    } catch (err: any) {
      toast.error(err.message);
    }
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
          <CardHeader className="pb-2"><CardTitle className="text-base">WhatsApp notifications</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Configure your WhatsApp API Key (e.g. from a service like Gupshup or WhatsApp Cloud API) to send bill details and wallet updates.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>WhatsApp API Key / Token</Label>
                <Input type="password" value={s.whatsapp_api_key ?? ""} onChange={(e) => setS({ ...s, whatsapp_api_key: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone Number ID</Label>
                <Input placeholder="e.g. 10655..." value={s.whatsapp_phone_number_id ?? ""} onChange={(e) => setS({ ...s, whatsapp_phone_number_id: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="wa" checked={s.whatsapp_enabled} onCheckedChange={(v) => setS({ ...s, whatsapp_enabled: v })} />
              <Label htmlFor="wa" className="cursor-pointer">Send thank-you WhatsApp after each bill</Label>
            </div>
          </CardContent>
        </Card>

        <Button type="submit">Save settings</Button>
      </form>
    </div>
  );
}
