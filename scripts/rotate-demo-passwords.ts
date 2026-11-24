import "dotenv/config";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { hashPassword } from "better-auth/crypto";
import { db } from "../src/lib/db";
if (process.env.NODE_ENV === "production" || process.env.DEMO_MODE !== "true")
  throw new Error("Demo rotation is development-only.");
let source = readFileSync(".env", "utf8");
for (const [userId, key] of [
  ["demo-client", "DEMO_CLIENT_PASSWORD"],
  ["demo-admin", "DEMO_ADMIN_PASSWORD"],
]) {
  const password = randomBytes(18).toString("base64url");
  const hashed = await hashPassword(password);
  await db.account.updateMany({
    where: { userId, providerId: "credential" },
    data: { password: hashed },
  });
  await db.session.deleteMany({ where: { userId } });
  source = source.replace(new RegExp(`^${key}=.*$`, "m"), `${key}=${password}`);
}
writeFileSync(".env", source);
await db.$disconnect();
console.log(
  "Unique local demo passwords rotated and existing sessions revoked. Values are only in ignored .env.",
);
