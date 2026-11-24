import "dotenv/config";
import EmbeddedPostgres from "embedded-postgres";
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
if (process.env.NODE_ENV === "production") throw new Error("Local database is development-only.");
const basePath =
  process.platform === "win32"
    ? execFileSync("cmd.exe", ["/d", "/c", "for %I in (.) do @echo %~sI"], {
        encoding: "utf8",
      }).trim()
    : process.cwd();
const databaseDir = resolve(basePath, ".local/postgres");
const tempPath = resolve(basePath, ".local/tmp");
mkdirSync(tempPath, { recursive: true });
process.env.TMP = tempPath;
process.env.TEMP = tempPath;
mkdirSync(databaseDir, { recursive: true });
const pg = new EmbeddedPostgres({
  databaseDir,
  user: "postgres",
  password: "postgres",
  port: 5432,
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: () => {},
  onError: () => {},
});
const clusterExists = existsSync(resolve(databaseDir, "PG_VERSION"));
if (!clusterExists) {
  if (process.platform === "win32") {
    const passwordFile = resolve(tempPath, "init-password");
    writeFileSync(passwordFile, "postgres\n");
    try {
      execFileSync(
        resolve(basePath, "node_modules/@embedded-postgres/windows-x64/native/bin/initdb.exe"),
        [
          "-D",
          databaseDir,
          "-U",
          "postgres",
          "--auth=scram-sha-256",
          `--pwfile=${passwordFile}`,
          "--encoding=UTF8",
          "--locale=C",
        ],
        { cwd: basePath, stdio: "pipe" },
      );
    } finally {
      unlinkSync(passwordFile);
    }
  } else await pg.initialise();
}
await pg.start();
const client = pg.getPgClient();
await client.connect();
const found = await client.query("SELECT 1 FROM pg_database WHERE datname = 'durak'");
if (!found.rowCount) await client.query("CREATE DATABASE durak");
await client.end();
console.log("Persistent development PostgreSQL is listening on 127.0.0.1:5432.");
async function stop() {
  await pg.stop();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 60_000);
