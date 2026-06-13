import { Router } from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET /api/notifications/audience
router.get("/audience", async (req, res) => {
    try {
        const { rows: customers } = await pool.query("SELECT DISTINCT phone, name FROM customers WHERE phone IS NOT NULL AND phone != ''");
        const { rows: walkins } = await pool.query("SELECT DISTINCT customer_phone as phone, customer_name as name FROM transactions WHERE customer_phone IS NOT NULL AND customer_phone != '' AND customer_id IS NULL");

        const recipientMap = new Map<string, string>();
        walkins.forEach(w => recipientMap.set(w.phone, w.name || "Guest"));
        customers.forEach(c => recipientMap.set(c.phone, c.name));

        const recipients = Array.from(recipientMap.entries()).map(([phone, name]) => ({ phone, name }));
        res.json(recipients);
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
