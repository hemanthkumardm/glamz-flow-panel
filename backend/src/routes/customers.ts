import { Router } from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { runFullBackup } from "../lib/csv-backup.js";

const router = Router();
router.use(requireAuth);

// GET /api/customers
router.get("/", async (_req, res) => {
    const { rows } = await pool.query("SELECT * FROM customers ORDER BY created_at DESC");
    res.json(rows);
});

// GET /api/customers/:id/delete-info
router.get("/:id/delete-info", async (req, res) => {
    const id = req.params.id;
    const { rows: [cust] } = await pool.query("SELECT id, name, wallet_balance FROM customers WHERE id=$1", [id]);
    if (!cust) { res.status(404).json({ message: "Not found" }); return; }
    const { rows: [stats] } = await pool.query(
        "SELECT COUNT(*)::int AS transaction_count FROM transactions WHERE customer_id=$1",
        [id]
    );
    res.json({
        name: cust.name,
        wallet_balance: cust.wallet_balance,
        transaction_count: stats?.transaction_count ?? 0,
    });
});

// GET /api/customers/:id  → { customer, plan, transactions }
router.get("/:id", async (req, res) => {
    const id = req.params.id;
    const [cRes, txRes] = await Promise.all([
        pool.query("SELECT c.*, p.name AS plan_name, p.price AS plan_price, p.credit_value FROM customers c LEFT JOIN plans p ON p.id=c.plan_id WHERE c.id=$1", [id]),
        pool.query(`
      SELECT t.*, json_agg(json_build_object('service_name',ti.service_name,'price',ti.price,'quantity',ti.quantity)) AS items
      FROM transactions t
      LEFT JOIN transaction_items ti ON ti.transaction_id=t.id
      WHERE t.customer_id=$1
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `, [id]),
    ]);
    const row = cRes.rows[0];
    if (!row) { res.status(404).json({ message: "Not found" }); return; }
    const { plan_name, plan_price, credit_value, ...customer } = row;
    const plan = plan_name ? { name: plan_name, price: plan_price, credit_value } : null;
    res.json({ customer, plan, transactions: txRes.rows });
});

// POST /api/customers
router.post("/", async (req, res) => {
    const { name, phone, email, wallet_balance, plan_id } = req.body;
    const dup = await pool.query("SELECT id FROM customers WHERE phone=$1", [phone]);
    if (dup.rows.length > 0) {
        res.status(409).json({ message: "A customer with this phone number already exists" });
        return;
    }
    const { rows } = await pool.query(
        "INSERT INTO customers (name,phone,email,wallet_balance,plan_id) VALUES ($1,$2,$3,$4,$5) RETURNING *",
        [name, phone, email ?? null, wallet_balance ?? 0, plan_id ?? null]
    );
    runFullBackup();
    res.status(201).json(rows[0]);
});

// PUT /api/customers/:id
router.put("/:id", async (req, res) => {
    const { name, phone, email } = req.body;
    const id = req.params.id;
    if (!name?.trim() || !phone?.trim()) {
        res.status(400).json({ message: "Name and phone are required" });
        return;
    }
    const dup = await pool.query("SELECT id FROM customers WHERE phone=$1 AND id<>$2", [phone, id]);
    if (dup.rows.length > 0) {
        res.status(409).json({ message: "Another customer already uses this phone number" });
        return;
    }
    const { rows } = await pool.query(
        "UPDATE customers SET name=$1, phone=$2, email=$3 WHERE id=$4 RETURNING *",
        [name.trim(), phone.trim(), email?.trim() || null, id]
    );
    if (!rows[0]) { res.status(404).json({ message: "Not found" }); return; }
    runFullBackup();
    res.json(rows[0]);
});

// PUT /api/customers/:id/plan
router.put("/:id/plan", async (req, res) => {
    const { plan_id, wallet_addition } = req.body;
    await pool.query("UPDATE customers SET plan_id=$1, wallet_balance=wallet_balance + $2 WHERE id=$3", [plan_id || null, wallet_addition ?? 0, req.params.id]);
    runFullBackup();
    res.json({ message: "Plan updated" });
});

// DELETE /api/customers/:id
router.delete("/:id", async (req, res) => {
    const id = req.params.id;
    const { rows: [cust] } = await pool.query("SELECT id FROM customers WHERE id=$1", [id]);
    if (!cust) { res.status(404).json({ message: "Not found" }); return; }
    const { rows: [stats] } = await pool.query(
        "SELECT COUNT(*)::int AS transaction_count FROM transactions WHERE customer_id=$1",
        [id]
    );
    await pool.query("DELETE FROM customers WHERE id=$1", [id]);
    runFullBackup();
    res.json({
        message: "Customer deleted",
        transactions_unlinked: stats?.transaction_count ?? 0,
    });
});

export default router;
