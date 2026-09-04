import { Router } from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
    const activeOnly = req.query.active === "true";
    const { rows } = await pool.query(
        `SELECT * FROM services ${activeOnly ? "WHERE active = true" : ""} ORDER BY name`
    );
    res.json(rows);
});

router.post("/", async (req, res) => {
    const { code, name, price } = req.body;
    const { rows } = await pool.query(
        "INSERT INTO services (code,name,price) VALUES ($1,$2,$3) RETURNING *",
        [code ?? null, name, price]
    );
    res.status(201).json(rows[0]);
});

router.put("/:id", async (req, res) => {
    const { code, name, price, active } = req.body;
    if (!name?.trim() || price == null || Number.isNaN(Number(price))) {
        res.status(400).json({ message: "Name and price are required" });
        return;
    }
    const { rows } = await pool.query(
        "UPDATE services SET code=$1, name=$2, price=$3, active=$4 WHERE id=$5 RETURNING *",
        [code?.trim() || null, name.trim(), Number(price), active !== false, req.params.id]
    );
    if (!rows[0]) { res.status(404).json({ message: "Not found" }); return; }
    res.json(rows[0]);
});

router.delete("/:id", async (req, res) => {
    await pool.query("DELETE FROM services WHERE id=$1", [req.params.id]);
    res.status(204).end();
});

export default router;
