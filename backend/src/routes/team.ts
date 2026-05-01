import { Router } from "express";
import pool from "../db.js";
import { requireAuth, requireAdmin, type AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET /api/team – list all users
router.get("/", async (_req, res) => {
    const { rows } = await pool.query(
        "SELECT id, phone, full_name, role, created_at FROM users ORDER BY created_at"
    );
    res.json(rows);
});

// PUT /api/team/:id/role – change a user's role (admin only)
router.put("/:id/role", requireAdmin, async (req: AuthRequest, res) => {
    const { role } = req.body;

    // STRICT: Only 'staff' is allowed for role updates now, because only ONE admin can exist.
    // If we ever wanted multiple admins, we'd allow 'admin' here, but the user requested 'admin can be only one time'.
    if (role !== "staff") {
        res.status(400).json({ message: "Only one Administrator is allowed in the system." });
        return;
    }

    await pool.query("UPDATE users SET role=$1 WHERE id=$2", [role, req.params.id]);
    res.json({ message: "Role updated to staff" });
});

export default router;
