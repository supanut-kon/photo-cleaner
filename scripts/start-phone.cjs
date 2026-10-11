const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const addresses = Object.values(os.networkInterfaces())
  .flat()
  .filter(
    (address) =>
      address &&
      address.family === "IPv4" &&
      !address.internal &&
      !address.address.startsWith("169.254."),
  );
const local = addresses.find((address) =>
  /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address.address),
);
const hostname = process.env.REACT_NATIVE_PACKAGER_HOSTNAME || local?.address;
if (hostname)
  console.log(`Open Expo Go on the same network: exp://${hostname}:8081`);
const cli = path.join(
  path.dirname(require.resolve("expo/package.json")),
  "bin",
  "cli",
);
const child = spawn(
  process.execPath,
  [cli, "start", "--go", "--lan", "--port", "8081", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    windowsHide: true,
    env: {
      ...process.env,
      ...(hostname ? { REACT_NATIVE_PACKAGER_HOSTNAME: hostname } : {}),
    },
  },
);
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 0;
});
