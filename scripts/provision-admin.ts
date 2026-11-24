import "dotenv/config";
import { db } from "../src/lib/db";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";
import { z } from "zod";
const data = z
  .object({ email: z.email(), name: z.string().min(2), password: z.string().min(16).max(128) })
  .parse({
    email: process.env.ADMIN_EMAIL,
    name: process.env.ADMIN_NAME,
    password: process.env.ADMIN_PASSWORD,
  });
if (await db.user.findUnique({ where: { email: data.email } }))
  throw new Error(
    "An account already exists. Use a separately audited role-change process; this script will not promote existing accounts.",
  );
const id = randomUUID(),
  password = await hashPassword(data.password);
await db.$transaction(async (tx) => {
  await tx.user.create({
    data: {
      id,
      name: data.name,
      email: data.email,
      role: "ADMIN",
      emailVerified: true,
      adultConfirmed: true,
      accounts: { create: { id: randomUUID(), providerId: "credential", accountId: id, password } },
    },
  });
  await tx.auditLog.create({
    data: { actorId: id, action: "ADMIN_PROVISIONED_OFFLINE", resourceId: id },
  });
});
console.log("Administrator provisioned. Credentials were not logged.");
await db.$disconnect();
