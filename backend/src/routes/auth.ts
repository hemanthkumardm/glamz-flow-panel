import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

const router = Router();
const SECRET = process.env.JWT_SECRET ?? "dev_secret_change_me";

function makeToken(id: string, role: string) {
    return jwt.sign({ id, role }, SECRET, { expiresIn: "30d" });
}

// POST /api/auth/register
// ONLY allowed if no users exist (initial setup) OR if done by an existing admin
router.post("/register", async (req, res) => {
    try {
        const { phone, password, full_name, role: requestedRole } = req.body;
        if (!phone || !password) {
            res.status(400).json({ message: "phone and password required" });
            return;
        }

        const countRes = await pool.query("SELECT COUNT(*) FROM users");
        const userCount = parseInt(countRes.rows[0].count);

        // STRICT: If users exist, only an admin can reach this, and they can ONLY create staff.
        if (userCount > 0) {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                return res.status(401).json({ message: "Initial setup complete. Only admins can add members." });
            }
            const token = authHeader.split(" ")[1];
            try {
                const payload = jwt.verify(token, SECRET) as any;
                if (payload.role !== "admin") {
                    return res.status(403).json({ message: "Access denied" });
                }
            } catch (err) {
                return res.status(401).json({ message: "Session invalid" });
            }
        }

        const hash = await bcrypt.hash(password, 12);

        // STRICT: Only the VERY FIRST user (count 0) can ever be 'admin'.
        // Subsequent users are ALWAYS 'staff' via this route.
        const finalRole = userCount === 0 ? "admin" : "staff";

        await pool.query(
            "INSERT INTO users (phone, password, full_name, role) VALUES ($1,$2,$3,$4)",
            [phone, hash, full_name ?? "", finalRole]
        );
        res.status(201).json({ message: `Account created successfully as ${finalRole}` });
    } catch (e: any) {
        console.error("Registration error:", e);
        if (e.code === "23505") {
            res.status(409).json({ message: "Number already registered" });
        } else {
            res.status(500).json({ message: e.message || "Server error" });
        }
    }
});

// GET /api/auth/status - check if system is initialized
router.get("/status", async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT COUNT(*) FROM users");
        res.json({ initialized: parseInt(rows[0].count) > 0 });
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
    try {
        const { phone, password } = req.body;
        const { rows } = await pool.query("SELECT * FROM users WHERE phone=$1", [phone]);
        const user = rows[0];
        if (!user || !(await bcrypt.compare(password, user.password))) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }
        const token = makeToken(user.id, user.role);
        res.json({ token, user: { id: user.id, phone: user.phone, full_name: user.full_name, role: user.role } });
    } catch (e: any) {
        console.error("Login error:", e);
        res.status(500).json({ message: e.message || "Server error" });
    }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
    const { rows } = await pool.query(
        "SELECT id, phone, full_name, role FROM users WHERE id=$1",
        [req.userId]
    );
    if (!rows[0]) { res.status(404).json({ message: "Not found" }); return; }
    res.json(rows[0]);
});

export default router;
