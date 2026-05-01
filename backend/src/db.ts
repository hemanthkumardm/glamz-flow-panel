import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

export const pool = new Pool({
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME ?? "glamz_db",
    user: process.env.DB_USER ?? "postgres",
    password: process.env.DB_PASSWORD,
});

pool.on("connect", () => console.log("✅ Postgres pool connected"));
pool.on("error", (err) => console.error("❌ Postgres pool error:", err));

export default pool;
