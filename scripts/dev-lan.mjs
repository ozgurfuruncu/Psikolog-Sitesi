import { spawn } from "node:child_process";
import { networkInterfaces } from "node:os";

if (process.env.NODE_ENV === "production") throw new Error("LAN preview is development-only.");

const addresses = Object.entries(networkInterfaces())
  .filter(
    ([name]) => !/vethernet|virtual|vmware|vbox|docker|wsl|vpn|tailscale|zerotier/i.test(name),
  )
  .flatMap(([, entries]) => entries || [])
  .filter(
    ({ family, internal, address }) =>
      family === "IPv4" &&
      !internal &&
      /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address),
  )
  .map(({ address }) => address);
const address = process.env.LAN_IP || addresses[0];
if (!address || !addresses.includes(address))
  throw new Error("No local network address found. Connect to your home network and try again.");
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("PORT must be a valid TCP port.");

const url = `http://${address}:${port}`;
const origins = [url, `http://localhost:${port}`, `http://127.0.0.1:${port}`];
console.log(`\nTelefondan ac: ${url}`);
console.log("Telefon ve bilgisayar ayni yerel agda olmali. Durdurmak icin Ctrl+C.\n");

const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--webpack",
    "--hostname",
    "0.0.0.0",
    "--port",
    String(port),
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "development",
      APP_URL: url,
      BETTER_AUTH_URL: url,
      DEV_LAN_ORIGINS: origins.join(","),
    },
  },
);
process.on("SIGINT", () => server.kill("SIGINT"));
process.on("SIGTERM", () => server.kill("SIGTERM"));
server.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
server.on("exit", (code) => process.exit(code ?? 1));
