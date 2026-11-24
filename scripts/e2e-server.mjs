import { spawn } from "node:child_process";
if (
  process.env.ISOLATED_TEST_MODE !== "true" ||
  !/^\/durak_e2e_[a-f0-9]{12}$/.test(new URL(process.env.DATABASE_URL).pathname)
)
  throw new Error("E2E server requires an explicitly isolated disposable database.");
const next = "node_modules/next/dist/bin/next";
const build = spawn(process.execPath, [next, "build", "--webpack"], {
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "production" },
});
const code = await new Promise((resolve) => build.on("exit", resolve));
if (code !== 0) process.exit(Number(code) || 1);
const server = spawn(
  process.execPath,
  [next, "start", "--port", "3100", "--hostname", "127.0.0.1"],
  { stdio: "inherit", env: { ...process.env, NODE_ENV: "production" } },
);
process.on("SIGINT", () => server.kill("SIGINT"));
process.on("SIGTERM", () => server.kill("SIGTERM"));
server.on("exit", (code) => process.exit(code || 0));
