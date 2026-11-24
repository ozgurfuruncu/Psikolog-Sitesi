import pg from "pg";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
export default async function setup() {
  const url = new URL(process.env.DATABASE_URL!);
  const databaseName = url.pathname.slice(1);
  if (!/^durak_test_[a-f0-9]{12}$/.test(databaseName))
    throw new Error("Refusing to operate on a non-test database.");
  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";
  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  const client = new pg.Client({ connectionString: url.toString() });
  await client.connect();
  const dirs = (await readdir("prisma/migrations", { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  for (const dir of dirs)
    await client.query(await readFile(resolve("prisma/migrations", dir, "migration.sql"), "utf8"));
  await client.end();
  return async () => {
    await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
    await admin.end();
  };
}
