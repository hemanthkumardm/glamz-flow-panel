import { Router } from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { sendWhatsAppNotification } from "../lib/whatsapp.js";

const router = Router();
router.use(requireAuth);

// POST /api/notifications/broadcast
router.post("/broadcast", async (req, res) => {
    const { message } = req.body;
    if (!message || message.trim().length === 0) {
        return res.status(400).json({ message: "Message content is required" });
    }

    try {
        // 1. Get all registered customers with phone numbers
        const { rows: customers } = await pool.query("SELECT DISTINCT phone, name FROM customers WHERE phone IS NOT NULL AND phone != ''");

        // 2. Get all unique walk-in phone numbers from transactions
        const { rows: walkins } = await pool.query("SELECT DISTINCT customer_phone as phone, customer_name as name FROM transactions WHERE customer_phone IS NOT NULL AND customer_phone != '' AND customer_id IS NULL");

        // 3. Deduplicate (priority to registered customers)
        const recipientMap = new Map<string, string>();
        walkins.forEach(w => recipientMap.set(w.phone, w.name || "Guest"));
        customers.forEach(c => recipientMap.set(c.phone, c.name));

        const recipients = Array.from(recipientMap.entries());

        if (recipients.length === 0) {
            return res.status(400).json({ message: "No recipients found" });
        }

        // 4. Send messages (in background)
        (async () => {
            const { rows: settRows } = await pool.query("SELECT business_name, whatsapp_enabled, whatsapp_api_key, whatsapp_phone_number_id FROM store_settings WHERE id = 1");
            const settings = settRows[0];

            if (!settings?.whatsapp_enabled || !settings?.whatsapp_api_key) {
                console.log("ℹ️ Broadcast aborted: WhatsApp disabled or not configured.");
                return;
            }

            console.log(`📣 Starting broadcast to ${recipients.length} recipients...`);

            for (const [phone, name] of recipients) {
                // We use a simplified version of sendWhatsAppNotification or a specialized broadcast one
                // For now, let's reuse a modified text
                try {
                    const cleanPhone = phone.replace(/\D/g, "");
                    const businessName = settings.business_name || "S M Glamz";
                    const formattedText = `*Message from ${businessName}*\n\nHello ${name},\n\n${message}`;

                    await fetch(`https://graph.facebook.com/v17.0/${settings.whatsapp_phone_number_id}/messages`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${settings.whatsapp_api_key}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            messaging_product: "whatsapp",
                            to: cleanPhone,
                            type: "text",
                            text: { body: formattedText }
                        })
                    });
                    // Small delay to prevent rate limits for large lists
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (err) {
                    console.error(`Failed to send broadcast to ${phone}:`, err);
                }
            }
            console.log("✅ Broadcast completed.");
        })();

        res.json({ message: "Broadcast started", recipientCount: recipients.length });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/notifications/stats
router.get("/stats", async (req, res) => {
    try {
        const { rows: customerCount } = await pool.query("SELECT COUNT(DISTINCT phone) FROM customers WHERE phone IS NOT NULL AND phone != ''");
        const { rows: walkinCount } = await pool.query("SELECT COUNT(DISTINCT customer_phone) FROM transactions WHERE customer_phone IS NOT NULL AND customer_phone != '' AND customer_id IS NULL");

        res.json({
            totalRegistered: parseInt(customerCount[0].count),
            totalWalkins: parseInt(walkinCount[0].count)
        });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
