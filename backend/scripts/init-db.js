import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Client } = pg;

async function main() {
    const dbName = process.env.DB_NAME || 'glamz_db';
    const user = process.env.DB_USER || 'postgres';
    const password = process.env.DB_PASSWORD || '';
    const host = process.env.DB_HOST || 'localhost';
    const port = Number(process.env.DB_PORT || 5432);

    console.log(`Connecting to PostgreSQL at ${host}:${port} as "${user}"...`);

    // Step 1: Connect to default maintenance database 'postgres' to ensure the database exists
    const adminClient = new Client({
        host,
        port,
        user,
        password,
        database: 'postgres',
    });

    try {
        await adminClient.connect();
    } catch (err) {
        console.error('❌ Could not connect to PostgreSQL server:');
        console.error(err.message);
        console.error('👉 Please check that PostgreSQL service is running and DB_PASSWORD in backend/.env is correct.');
        process.exit(1);
    }

    try {
        const checkRes = await adminClient.query(
            'SELECT 1 FROM pg_database WHERE datname = $1',
            [dbName]
        );
        if (checkRes.rowCount === 0) {
            console.log(`Creating database "${dbName}"...`);
            // datname cannot be parameterized in CREATE DATABASE
            await adminClient.query(`CREATE DATABASE "${dbName}"`);
            console.log(`✅ Database "${dbName}" created successfully.`);
        } else {
            console.log(`ℹ️  Database "${dbName}" already exists.`);
        }
    } catch (err) {
        console.error(`❌ Error verifying/creating database "${dbName}":`, err.message);
        process.exit(1);
    } finally {
        await adminClient.end();
    }

    // Step 2: Connect to the target database and execute migrations.sql
    const appClient = new Client({
        host,
        port,
        user,
        password,
        database: dbName,
    });

    try {
        await appClient.connect();
        const migrationsPath = path.join(__dirname, '../src/db/migrations.sql');
        if (fs.existsSync(migrationsPath)) {
            console.log(`Applying migrations from ${migrationsPath}...`);
            const sql = fs.readFileSync(migrationsPath, 'utf8');
            await appClient.query(sql);
            console.log('✅ Migrations applied successfully. All tables and settings are ready.');
        } else {
            console.warn(`⚠️ Migrations file not found at ${migrationsPath}`);
        }
    } catch (err) {
        console.error('❌ Failed to run migrations:', err.message);
        process.exit(1);
    } finally {
        await appClient.end();
    }
}

main().catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
