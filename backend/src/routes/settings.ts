import { Router } from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET /api/settings
router.get("/", async (_req, res) => {
    const { rows } = await pool.query("SELECT * FROM store_settings WHERE id=1");
    res.json(rows[0] ?? {});
});

// PUT /api/settings
router.put("/", async (req, res) => {
    const { business_name, address, phone, gstin, gst_default_on, whatsapp_enabled, whatsapp_api_key, whatsapp_phone_number_id, member_discount_pct } = req.body;
    const { rows } = await pool.query(
        `UPDATE store_settings SET
       business_name=$1, address=$2, phone=$3, gstin=$4,
       gst_default_on=$5, whatsapp_enabled=$6, whatsapp_api_key=$7, whatsapp_phone_number_id=$8,
       member_discount_pct=$9
     WHERE id=1 RETURNING *`,
        [business_name, address, phone, gstin, gst_default_on, whatsapp_enabled, whatsapp_api_key ?? null, whatsapp_phone_number_id ?? null, member_discount_pct ?? 10]
    );
    res.json(rows[0]);
});

export default router;
