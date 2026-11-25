import { spawn } from "node:child_process";
import { mkdir, access } from "node:fs/promises";
import { constants } from "node:fs";
import { loadEnvConfig } from "@next/env";
import { validateProduction } from "./production-config.mjs";
loadEnvConfig(process.cwd(), false);
const env = { ...process.env, NODE_ENV: "production" };
env.APP_URL ||= env.RENDER_EXTERNAL_URL;
env.BETTER_AUTH_URL ||= env.APP_URL;
const errors = validateProduction(env);
if (errors.length) {
  console.error(
    "Production configuration rejected:\n" + errors.map((error) => `- ${error}`).join("\n"),
  );
  process.exit(1);
}
// Free Render instances do not support preDeployCommand or persistent disks.
// Provision the isolated review before accepting traffic; seeding is idempotent.
if (env.REVIEW_MODE === "true") {
  for (const args of [
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    ["--import", "tsx", "scripts/seed.ts"],
  ]) {
    const task = spawn(process.execPath, args, { env, stdio: "inherit" });
    task.on("error", () => process.exit(1));
    const code = await new Promise((done) => task.on("exit", done));
    if (code !== 0) process.exit(1);
  }
} else {
  await mkdir(env.PRIVATE_STORAGE_PATH, { recursive: true, mode: 0o700 });
  await access(env.PRIVATE_STORAGE_PATH, constants.W_OK);
}
const worker =
  env.REVIEW_MODE === "true"
    ? spawn(process.execPath, ["--import", "tsx", "scripts/worker.ts"], { env, stdio: "inherit" })
    : undefined;
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "0.0.0.0",
    "--port",
    env.PORT || "3000",
  ],
  { stdio: "inherit", env },
);
function stop(signal) {
  worker?.kill(signal);
  child.kill(signal);
}
process.on("SIGTERM", () => stop("SIGTERM"));
process.on("SIGINT", () => stop("SIGINT"));
worker?.on("error", () => {
  stop("SIGTERM");
  process.exit(1);
});
worker?.on("exit", () => {
  child.kill("SIGTERM");
});
child.on("error", () => {
  console.error("Production process failed to start.");
  process.exit(1);
});
child.on("exit", (code) => {
  worker?.kill("SIGTERM");
  process.exit(code ?? 1);
});
