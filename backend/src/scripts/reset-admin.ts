import pool from "../db.js";
import bcrypt from "bcryptjs";
import readline from "readline";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function reset() {
    console.log("🔐 S M Glamz - Emergency Admin Recovery");

    try {
        const { rows } = await pool.query("SELECT id, phone, full_name, role FROM users WHERE role = 'admin' LIMIT 1");
        const admin = rows[0];

        if (!admin) {
            console.log("❌ No admin user found in the database. Please register the first user via the web interface.");
            process.exit(1);
        }

        console.log(`\nFound Admin: ${admin.full_name} (${admin.phone})`);

        rl.question("Enter NEW phone number (leave blank to keep current): ", async (newPhone) => {
            rl.question("Enter NEW password: ", async (newPass) => {
                if (!newPass || newPass.length < 6) {
                    console.log("❌ Password must be at least 6 characters.");
                    process.exit(1);
                }

                const hash = await bcrypt.hash(newPass, 12);
                const finalPhone = newPhone || admin.phone;

                await pool.query(
                    "UPDATE users SET phone = $1, password = $2 WHERE id = $3",
                    [finalPhone, hash, admin.id]
                );

                console.log("\n✅ Success! Admin credentials have been reset.");
                console.log(`Phone: ${finalPhone}`);
                console.log(`New Password: ${newPass}`);
                console.log("\nYou can now login at http://localhost:4000");
                process.exit(0);
            });
        });

    } catch (err) {
        console.error("❌ Error during reset:", err);
        process.exit(1);
    }
}

reset();
