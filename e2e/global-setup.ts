import pg from "pg";
import { readdir, readFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
export default async function setup() {
  if (process.env.DEMO_MODE !== "true")
    throw new Error("E2E requires development demo configuration.");
  const url = new URL(process.env.DATABASE_URL!),
    name = url.pathname.slice(1);
  if (!/^durak_e2e_[a-f0-9]{12}$/.test(name)) throw new Error("Unsafe database name.");
  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";
  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  await admin.query(`CREATE DATABASE "${name}"`);
  await admin.end();
  const client = new pg.Client({ connectionString: url.toString() });
  await client.connect();
  const dirs = (await readdir("prisma/migrations", { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  for (const dir of dirs)
    await client.query(await readFile(resolve("prisma/migrations", dir, "migration.sql"), "utf8"));
  execFileSync(process.execPath, ["--import", "tsx", "scripts/seed.ts"], {
    env: { ...process.env, NODE_ENV: "development" },
    stdio: "pipe",
  });
  // Free the seeded current-time range so the complete browser journey can use a fresh appointment.
  await client.query("UPDATE \"Appointment\" SET status = 'COMPLETED' WHERE id = 'demo-live'");
  await client.end();
  await mkdir("docs/screenshots", { recursive: true });
}
