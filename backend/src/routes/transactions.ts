import { Router } from "express";
import pool from "../db.js";
import { requireAuth, requireAdmin, type AuthRequest } from "../middleware/auth.js";
import { runFullBackup } from "../lib/csv-backup.js";

const router = Router();
router.use(requireAuth);

// GET /api/transactions?from=ISO&to=ISO&customer_id=UUID
router.get("/", async (req, res) => {
    const { from, to, customer_id } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: any[] = [];
    if (from) { params.push(from); conditions.push(`t.created_at >= $${params.length}`); }
    if (to) { params.push(to); conditions.push(`t.created_at <= $${params.length}`); }
    if (customer_id) { params.push(customer_id); conditions.push(`t.customer_id = $${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(
        `SELECT t.*, 
            COALESCE((SELECT name FROM customers WHERE id = t.customer_id), t.customer_name) AS customer_name,
            COALESCE((SELECT phone FROM customers WHERE id = t.customer_id), t.customer_phone) AS customer_phone,
            (SELECT json_agg(json_build_object('service_name',service_name,'price',price,'quantity',quantity,'staff_name',staff_name)) 
             FROM transaction_items WHERE transaction_id = t.id) AS items
      FROM transactions t
      ${where}
      ORDER BY t.created_at DESC`,
        params
    );
    res.json(rows);
});

// POST /api/transactions  – create transaction + items, update wallet
router.post("/", async (req, res) => {
    const {
        customer_id, staff_name, customer_name, customer_phone, subtotal, discount_pct, discount_flat, discount_amount,
        gst_applied, cgst_amount, sgst_amount, total,
        cash_amount, upi_amount, wallet_amount, upi_txn_id, items = [],
    } = req.body;

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Deduct wallet balance from customer (only if not walk-in)
        let walletAfter = 0;
        if (customer_id) {
            const custRes = await client.query(
                "UPDATE customers SET wallet_balance = wallet_balance - $1 WHERE id=$2 RETURNING wallet_balance",
                [wallet_amount ?? 0, customer_id]
            );
            walletAfter = custRes.rows[0]?.wallet_balance ?? 0;
        }

        const txRes = await client.query(
            `INSERT INTO transactions
        (customer_id,staff_name,customer_name,customer_phone,subtotal,discount_pct,discount_flat,discount_amount,
         gst_applied,cgst_amount,sgst_amount,total,cash_amount,upi_amount,wallet_amount,
         wallet_balance_after,upi_txn_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
            [customer_id, staff_name, customer_name || null, customer_phone || null, subtotal, discount_pct ?? 0, discount_flat ?? 0,
                discount_amount ?? 0, gst_applied ?? true, cgst_amount ?? 0, sgst_amount ?? 0,
                total, cash_amount ?? 0, upi_amount ?? 0, wallet_amount ?? 0, walletAfter, upi_txn_id ?? null]
        );
        const tx = txRes.rows[0];

        // Insert line items
        for (const item of items) {
            await client.query(
                "INSERT INTO transaction_items (transaction_id,service_id,service_name,price,quantity,staff_name) VALUES ($1,$2,$3,$4,$5,$6)",
                [tx.id, item.service_id ?? null, item.service_name, item.price, item.quantity ?? 1, item.staff_name || null]
            );
        }

        await client.query("COMMIT");

        // 4. Trigger Automatic CSV Backup
        runFullBackup();

        res.status(201).json(tx);
    } catch (e: any) {
        await client.query("ROLLBACK");
        res.status(500).json({ message: e.message });
    } finally {
        client.release();
    }
});

// POST /api/transactions/:id/void – admin only, restores wallet if used
router.post("/:id/void", requireAdmin, async (req: AuthRequest, res) => {
    const id = req.params.id;
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const txRes = await client.query("SELECT * FROM transactions WHERE id=$1 FOR UPDATE", [id]);
        const tx = txRes.rows[0];
        if (!tx) {
            await client.query("ROLLBACK");
            res.status(404).json({ message: "Bill not found" });
            return;
        }
        if (tx.voided_at) {
            await client.query("ROLLBACK");
            res.status(400).json({ message: "This bill is already voided" });
            return;
        }

        const userRes = await client.query("SELECT full_name, phone FROM users WHERE id=$1", [req.userId]);
        const voidedBy = userRes.rows[0]?.full_name || userRes.rows[0]?.phone || "Admin";

        if (tx.customer_id && Number(tx.wallet_amount) > 0) {
            await client.query(
                "UPDATE customers SET wallet_balance = wallet_balance + $1 WHERE id=$2",
                [tx.wallet_amount, tx.customer_id]
            );
        }

        const { rows } = await client.query(
            "UPDATE transactions SET voided_at=NOW(), voided_by=$1 WHERE id=$2 RETURNING *",
            [voidedBy, id]
        );

        await client.query("COMMIT");
        runFullBackup();
        res.json(rows[0]);
    } catch (e: any) {
        await client.query("ROLLBACK");
        res.status(500).json({ message: e.message });
    } finally {
        client.release();
    }
});

export default router;
