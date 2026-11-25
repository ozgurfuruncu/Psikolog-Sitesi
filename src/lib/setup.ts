import { timingSafeEqual, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { db } from "./db";
import { fail } from "./errors";

export async function setupAvailable() {
  return (
    !!process.env.SETUP_TOKEN &&
    process.env.SETUP_TOKEN.length >= 32 &&
    (await db.user.count({ where: { role: "ADMIN" } })) === 0
  );
}
export async function setupAdministrator(body: unknown) {
  const data = z
    .object({
      token: z.string().max(200),
      name: z.string().trim().min(2).max(100),
      email: z.email(),
      password: z.string().min(16).max(128),
    })
    .parse(body);
  const expected = process.env.SETUP_TOKEN || "";
  const actual = Buffer.from(data.token),
    target = Buffer.from(expected);
  if (expected.length < 32 || actual.length !== target.length || !timingSafeEqual(actual, target))
    fail("Kurulum bilgileri doğrulanamadı.", 403);
  const password = await hashPassword(data.password);
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(71343)`;
    if (await tx.user.count({ where: { role: "ADMIN" } }))
      fail("İlk kurulum zaten tamamlanmış.", 409);
    if (await tx.user.findUnique({ where: { email: data.email } }))
      fail("Farklı bir yönetici e-posta adresi kullanın.", 409);
    const id = randomUUID();
    await tx.user.create({
      data: {
        id,
        name: data.name,
        email: data.email,
        role: "ADMIN",
        emailVerified: true,
        adultConfirmed: true,
        accounts: {
          create: { id: randomUUID(), accountId: id, providerId: "credential", password },
        },
      },
    });
    await tx.psychologistProfile.upsert({ where: { id: "primary" }, create: {}, update: {} });
    await tx.siteSettings.upsert({
      where: { id: "primary" },
      create: {
        showProfile: false,
        showEducation: false,
        showCertificates: false,
        showBlog: false,
      },
      update: {
        showProfile: false,
        showEducation: false,
        showCertificates: false,
        showBlog: false,
      },
    });
    await tx.auditLog.create({
      data: { actorId: id, action: "INITIAL_ADMIN_SETUP", resourceId: id },
    });
  });
}
