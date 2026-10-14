const { spawn } = require("node:child_process");

const child = spawn(process.execPath, [
  require.resolve("expo/bin/cli"), "start", "--dev-client", ...process.argv.slice(2),
], {
  stdio: "inherit",
  env: { ...process.env, EXPO_PUBLIC_GLASS_BACKEND: "library" },
});
child.on("exit", (code) => process.exit(code ?? 1));
child.on("error", (error) => { console.error(error.message); process.exit(1); });
