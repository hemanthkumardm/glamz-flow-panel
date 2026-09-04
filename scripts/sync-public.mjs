import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const src = path.join(root, "dist");
const dest = path.join(root, "backend", "public");

function copyRecursive(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const srcPath = path.join(from, entry.name);
    const destPath = path.join(to, entry.name);
    if (entry.isDirectory()) copyRecursive(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

if (!fs.existsSync(src)) {
  console.error("dist/ not found. Run npm run build first.");
  process.exit(1);
}

if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
copyRecursive(src, dest);
console.log("Synced dist/ -> backend/public/");