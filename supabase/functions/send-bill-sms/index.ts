// Send a thank-you SMS to the customer after a bill is created.
// Uses Twilio via the Lovable connector gateway. The connector must be linked
// (chat: "connect Twilio") for this to work.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

interface Body {
  phone: string;
  customerName: string;
  total: number;
  walletAfter: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: Body = await req.json();
    if (!body.phone || typeof body.total !== "number") {
      return new Response(JSON.stringify({ error: "phone and total required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY || !TWILIO_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Twilio connector not linked. Connect Twilio in Lovable." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get sender number from settings
    const sRes = await fetch(`${SUPABASE_URL}/rest/v1/store_settings?id=eq.1&select=twilio_from_number,business_name`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const settings = (await sRes.json())[0];
    const fromNumber: string | null = settings?.twilio_from_number;
    const businessName: string = settings?.business_name ?? "S M Glamz";
    if (!fromNumber) {
      return new Response(JSON.stringify({ error: "Twilio sender number not configured in Settings" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text =
      `Thank you ${body.customerName}! Your bill at ${businessName} is Rs.${body.total.toFixed(2)}. ` +
      `Wallet balance: Rs.${(body.walletAfter ?? 0).toFixed(2)}. Visit again!`;

    const twRes = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: body.phone, From: fromNumber, Body: text }),
    });
    const data = await twRes.json();
    if (!twRes.ok) {
      return new Response(JSON.stringify({ error: `Twilio ${twRes.status}`, detail: data }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, sid: data.sid }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
