import { Router } from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (_req, res) => {
    const { rows } = await pool.query("SELECT * FROM services ORDER BY name");
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

router.delete("/:id", async (req, res) => {
    await pool.query("DELETE FROM services WHERE id=$1", [req.params.id]);
    res.status(204).end();
});

export default router;
