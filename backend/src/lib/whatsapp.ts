import pool from "../db.js";

interface WhatsAppMessage {
    phone: string;
    customerName: string;
    total: number;
    walletBalance: number;
    businessName: string;
}

export async function sendWhatsAppNotification(msg: WhatsAppMessage) {
    try {
        // 1. Get settings
        const { rows: settRows } = await pool.query("SELECT * FROM store_settings WHERE id=1");
        const settings = settRows[0];

        if (!settings?.whatsapp_enabled || !settings?.whatsapp_api_key || !settings?.whatsapp_phone_number_id) {
            console.log("ℹ️ WhatsApp notifications disabled or configuration incomplete.");
            return;
        }

        // Sanitize phone number (remove +, spaces, dashes)
        const cleanPhone = msg.phone.replace(/\D/g, "");

        const text = `*Thank you for visiting ${msg.businessName}!* 🌟\n\n` +
            `Your bill for *₹${msg.total.toLocaleString("en-IN")}* has been processed.\n` +
            `Updated Wallet Balance: *₹${msg.walletBalance.toLocaleString("en-IN")}*.\n\n` +
            `See you again soon! ✨`;

        console.log(`📱 [WhatsApp API] Attempting to send to ${cleanPhone}...`);

        // Official Meta WhatsApp Cloud API Call
        const response = await fetch(`https://graph.facebook.com/v17.0/${settings.whatsapp_phone_number_id}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${settings.whatsapp_api_key}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: cleanPhone,
                type: "text",
                text: {
                    preview_url: false,
                    body: text
                }
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(JSON.stringify(data));
        }

        console.log("✅ WhatsApp message sent successfully!");

    } catch (err: any) {
        console.error("❌ Failed to send WhatsApp notification:", err.message);
    }
}
