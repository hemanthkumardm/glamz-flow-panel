import pool from "../db.js";
import bcrypt from "bcryptjs";
import readline from "readline";

async function performReset(adminId: string, finalPhone: string, newPass: string) {
    if (!newPass || newPass.length < 6) {
        console.error("❌ Password must be at least 6 characters.");
        process.exit(1);
    }

    const hash = await bcrypt.hash(newPass, 12);

    await pool.query(
        "UPDATE users SET phone = $1, password = $2 WHERE id = $3",
        [finalPhone, hash, adminId]
    );

    console.log("\n✅ Success! Admin credentials have been reset.");
    console.log(`Phone: ${finalPhone}`);
    console.log(`New Password: ${newPass}`);
    console.log("\nYou can now login at http://localhost:4000");
    await pool.end();
    process.exit(0);
}

async function reset() {
    console.log("🔐 S M Glamz - Emergency Admin Recovery");

    try {
        const { rows } = await pool.query("SELECT id, phone, full_name, role FROM users WHERE role = 'admin' LIMIT 1");
        const admin = rows[0];

        if (!admin) {
            console.log("❌ No admin user found in the database. Please register the first user via the web interface at http://localhost:4000");
            await pool.end();
            process.exit(1);
        }

        console.log(`\nFound Admin: ${admin.full_name || 'Admin'} (Phone: ${admin.phone})`);

        // Check if passed via command line: node reset-admin.js <newPassword> [newPhone]
        const argPass = process.argv[2];
        const argPhone = process.argv[3];

        if (argPass) {
            await performReset(admin.id, argPhone || admin.phone, argPass);
            return;
        }

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question("Enter NEW phone number (leave blank to keep current): ", async (newPhone) => {
            rl.question("Enter NEW password: ", async (newPass) => {
                rl.close();
                await performReset(admin.id, (newPhone && newPhone.trim()) || admin.phone, newPass.trim());
            });
        });

    } catch (err) {
        console.error("❌ Error during reset:", err);
        await pool.end();
        process.exit(1);
    }
}

reset();
