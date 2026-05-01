import { Router } from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (_req, res) => {
    const { rows } = await pool.query("SELECT * FROM plans ORDER BY created_at DESC");
    res.json(rows);
});

router.post("/", async (req, res) => {
    const { name, price, credit_value } = req.body;
    const { rows } = await pool.query(
        "INSERT INTO plans (name,price,credit_value) VALUES ($1,$2,$3) RETURNING *",
        [name, price, credit_value]
    );
    res.status(201).json(rows[0]);
});

router.delete("/:id", async (req, res) => {
    await pool.query("DELETE FROM plans WHERE id=$1", [req.params.id]);
    res.status(204).end();
});

export default router;
