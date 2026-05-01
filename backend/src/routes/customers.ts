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
    const { rows } = await pool.query(
        "INSERT INTO customers (name,phone,email,wallet_balance,plan_id) VALUES ($1,$2,$3,$4,$5) RETURNING *",
        [name, phone, email ?? null, wallet_balance ?? 0, plan_id ?? null]
    );
    runFullBackup();
    res.status(201).json(rows[0]);
});

// DELETE /api/customers/:id
router.delete("/:id", async (req, res) => {
    await pool.query("DELETE FROM customers WHERE id=$1", [req.params.id]);
    runFullBackup();
    res.status(204).end();
});

export default router;
