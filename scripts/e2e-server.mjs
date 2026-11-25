import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import https from "node:https";
import http from "node:http";
if (
  process.env.ISOLATED_TEST_MODE !== "true" ||
  !/^\/durak_e2e_[a-f0-9]{12}$/.test(new URL(process.env.DATABASE_URL).pathname)
)
  throw new Error("E2E server requires an explicitly isolated disposable database.");
const next = "node_modules/next/dist/bin/next";
execFileSync(process.execPath, ["--import", "tsx", "scripts/prepare-e2e.ts"], {
  stdio: "inherit",
  env: process.env,
});
const tlsDir = resolve(".local/e2e-tls");
mkdirSync(tlsDir, { recursive: true });
const keyPath = resolve(tlsDir, "key.pem"),
  certPath = resolve(tlsDir, "cert.pem");
const windowsOpenSSL = "C:/Program Files/Git/usr/bin/openssl.exe";
const openssl =
  process.platform === "win32" && existsSync(windowsOpenSSL) ? windowsOpenSSL : "openssl";
execFileSync(
  openssl,
  [
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-nodes",
    "-keyout",
    keyPath,
    "-out",
    certPath,
    "-days",
    "1",
    "-subj",
    "/CN=localhost",
    "-addext",
    "subjectAltName=DNS:localhost,IP:127.0.0.1",
  ],
  { stdio: "pipe" },
);
const build = spawn(process.execPath, [next, "build", "--webpack"], {
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "production" },
});
const code = await new Promise((resolve) => build.on("exit", resolve));
if (code !== 0) process.exit(Number(code) || 1);
const server = spawn(
  process.execPath,
  [next, "start", "--port", "3101", "--hostname", "127.0.0.1"],
  { stdio: "inherit", env: { ...process.env, NODE_ENV: "production" } },
);
const ingress = https.createServer(
  { key: readFileSync(keyPath), cert: readFileSync(certPath) },
  (request, response) => {
    const forwarded = http.request(
      {
        hostname: "127.0.0.1",
        port: 3101,
        path: request.url,
        method: request.method,
        headers: { ...request.headers, host: "localhost:3100", "x-forwarded-proto": "https" },
      },
      (upstream) => {
        response.writeHead(upstream.statusCode || 502, upstream.headers);
        upstream.pipe(response);
      },
    );
    forwarded.on("error", () => {
      response.writeHead(503);
      response.end();
    });
    request.pipe(forwarded);
  },
);
ingress.listen(3100, "127.0.0.1");
process.on("SIGINT", () => {
  ingress.close();
  server.kill("SIGINT");
});
process.on("SIGTERM", () => {
  ingress.close();
  server.kill("SIGTERM");
});
server.on("exit", (code) => process.exit(code || 0));
