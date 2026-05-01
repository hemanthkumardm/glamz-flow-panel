/**
 * CSV Backup Utility
 * Automatically exports customers, transactions, and transaction items
 * to CSV files in the /backups directory after every critical operation.
 */

import pool from "../db.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// backups/ folder sits at the project root (next to backend/)
const BACKUP_DIR = path.resolve(__dirname, "../../../backups");

function ensureDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
}

function escapeCsv(val: any): string {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function rowToCsv(headers: string[], row: Record<string, any>): string {
    return headers.map(h => escapeCsv(row[h])).join(",");
}

function writeCsv(filename: string, headers: string[], rows: Record<string, any>[]) {
    ensureDir();
    const headerLine = headers.join(",");
    const dataLines = rows.map(r => rowToCsv(headers, r));
    const content = [headerLine, ...dataLines].join("\n") + "\n";
    fs.writeFileSync(path.join(BACKUP_DIR, filename), content, "utf-8");
}

// ─── Export Functions ─────────────────────────────────────────────────────────

export async function backupCustomers() {
    try {
        const { rows } = await pool.query(
            "SELECT id, name, phone, email, wallet_balance, plan_id, created_at FROM customers ORDER BY created_at"
        );
        writeCsv("customers.csv", ["id", "name", "phone", "email", "wallet_balance", "plan_id", "created_at"], rows);
        console.log(`📋 Backup: customers.csv (${rows.length} records)`);
    } catch (e) {
        console.error("Backup error (customers):", e);
    }
}

export async function backupTransactions() {
    try {
        const { rows } = await pool.query(
            `SELECT t.id, t.customer_id, t.staff_name, t.customer_name, t.customer_phone,
                    t.subtotal, t.discount_amount, t.gst_applied, t.cgst_amount, t.sgst_amount,
                    t.total, t.cash_amount, t.upi_amount, t.wallet_amount, 
                    t.wallet_balance_after, t.upi_txn_id, t.created_at
             FROM transactions t ORDER BY t.created_at`
        );
        writeCsv("transactions.csv", [
            "id", "customer_id", "staff_name", "customer_name", "customer_phone",
            "subtotal", "discount_amount", "gst_applied", "cgst_amount", "sgst_amount",
            "total", "cash_amount", "upi_amount", "wallet_amount",
            "wallet_balance_after", "upi_txn_id", "created_at"
        ], rows);
        console.log(`📋 Backup: transactions.csv (${rows.length} records)`);
    } catch (e) {
        console.error("Backup error (transactions):", e);
    }
}

export async function backupTransactionItems() {
    try {
        const { rows } = await pool.query(
            `SELECT ti.id, ti.transaction_id, ti.service_name, ti.price, ti.quantity
             FROM transaction_items ti ORDER BY ti.id`
        );
        writeCsv("transaction_items.csv", ["id", "transaction_id", "service_name", "price", "quantity"], rows);
        console.log(`📋 Backup: transaction_items.csv (${rows.length} records)`);
    } catch (e) {
        console.error("Backup error (items):", e);
    }
}

export async function backupWalletSummary() {
    try {
        const { rows } = await pool.query(
            `SELECT id, name, phone, wallet_balance FROM customers WHERE wallet_balance != 0 ORDER BY name`
        );
        writeCsv("wallet_balances.csv", ["id", "name", "phone", "wallet_balance"], rows);
        console.log(`📋 Backup: wallet_balances.csv (${rows.length} records)`);
    } catch (e) {
        console.error("Backup error (wallets):", e);
    }
}

/**
 * Run a full backup of all critical data.
 * Called after every transaction or customer mutation.
 */
export async function runFullBackup() {
    await Promise.all([
        backupCustomers(),
        backupTransactions(),
        backupTransactionItems(),
        backupWalletSummary(),
    ]);
}
