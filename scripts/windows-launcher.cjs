/**
 * Windows launcher stub. Compile to GlamzLauncher.exe with:
 *   npx @yao-pkg/pkg scripts/windows-launcher.cjs --targets node18-win-x64 --output GlamzLauncher.exe
 *
 * Place GlamzLauncher.exe in the project root (next to start-app.bat).
 */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.dirname(process.execPath);
const startBat = path.join(root, "start-app.bat");

if (!fs.existsSync(startBat)) {
  spawn(
    "mshta",
    ["javascript:alert('start-app.bat not found.\\n\\nKeep GlamzLauncher.exe in the S M Glamz salon folder.');close()"],
    { windowsHide: true }
  );
  process.exit(1);
}

const child = spawn("cmd.exe", ["/c", startBat], {
  cwd: root,
  stdio: "inherit",
  windowsHide: false,
});

child.on("exit", (code) => process.exit(code ?? 0));