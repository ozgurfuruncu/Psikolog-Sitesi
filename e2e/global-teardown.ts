import pg from "pg";
export default async function teardown() {
  const url = new URL(process.env.DATABASE_URL!),
    name = url.pathname.slice(1);
  if (!/^durak_e2e_[a-f0-9]{12}$/.test(name)) throw new Error("Unsafe database name.");
  url.pathname = "/postgres";
  const admin = new pg.Client({ connectionString: url.toString() });
  await admin.connect();
  await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
  await admin.end();
}
