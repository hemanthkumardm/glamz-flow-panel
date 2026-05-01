import "dotenv/config";
import express from "express";
import cors from "cors";
import authRouter from "./routes/auth.js";
import customersRouter from "./routes/customers.js";
import transactionsRouter from "./routes/transactions.js";
import servicesRouter from "./routes/services.js";
import plansRouter from "./routes/plans.js";
import teamRouter from "./routes/team.js";
import settingsRoutes from "./routes/settings.js";
import notificationsRoutes from "./routes/notifications.js";

import path from "path";
import { fileURLToPath } from "url";
import { runFullBackup } from "./lib/csv-backup.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(cors({
    origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:8080",
    credentials: true,
}));
app.use(express.json());

// Request logger
app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Serve static files from the "public" folder (the built frontend)
const publicPath = path.join(__dirname, "../public");
app.use(express.static(publicPath));

// Health check
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// Routes
app.use("/api/auth", authRouter);
app.use("/api/customers", customersRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/services", servicesRouter);
app.use("/api/plans", plansRouter);
app.use("/api/team", teamRouter);
app.use("/api/settings", settingsRoutes);
app.use("/api/notifications", notificationsRoutes);

// SPA Routing: Serve index.html for any other GET requests (fallback)
app.get("*", (req, res) => {
    if (req.url.startsWith("/api")) return res.status(404).json({ message: "API route not found" });
    res.sendFile(path.join(publicPath, "index.html"));
});

import { pool } from "./db.js";

// Self-healing: Ensure required columns exist
const ensureSchema = async () => {
    try {
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='customer_name') THEN
                    ALTER TABLE transactions ADD COLUMN customer_name TEXT;
                END IF;
                if NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='customer_phone') THEN
                    ALTER TABLE transactions ADD COLUMN customer_phone TEXT;
                END IF;
            END $$;
        `);
        console.log("✅ Database schema verified.");
    } catch (err) {
        console.error("⚠️  Database schema check failed:", err);
    }
};

app.listen(PORT, async () => {
    await ensureSchema();
    await runFullBackup();
    console.log(`🚀 Glamz web application running on http://localhost:${PORT}`);
});
