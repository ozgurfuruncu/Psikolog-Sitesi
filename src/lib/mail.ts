import { db } from "./db";
import { isDemo } from "./env";
import nodemailer from "nodemailer";
import { randomUUID } from "node:crypto";

export async function queueEmail(
  recipient: string,
  subject: string,
  text: string,
  dedupeKey = randomUUID(),
) {
  await db.emailDelivery.upsert({
    where: { dedupeKey },
    create: { recipient, subject, text, dedupeKey },
    update: {},
  });
}

export async function deliverEmails() {
  const items = await db.$queryRaw<
    Array<{ id: string; recipient: string; subject: string; text: string; attempts: number }>
  >`
    UPDATE "EmailDelivery" SET status = 'PROCESSING', "lockedUntil" = NOW() + INTERVAL '5 minutes'
    WHERE id IN (SELECT id FROM "EmailDelivery" WHERE
      ((status = 'PENDING' AND "availableAt" <= NOW()) OR (status = 'PROCESSING' AND "lockedUntil" < NOW()))
      AND attempts < 5 ORDER BY "createdAt" FOR UPDATE SKIP LOCKED LIMIT 20)
    RETURNING id, recipient, subject, text, attempts`;
  for (const item of items) {
    try {
      if (process.env.EMAIL_PROVIDER === "preview" && isDemo()) {
        await db.emailDelivery.update({
          where: { id: item.id },
          data: {
            status: "PREVIEW",
            deliveredAt: new Date(),
            attempts: { increment: 1 },
            lockedUntil: null,
          },
        });
        continue;
      }
      if (process.env.EMAIL_PROVIDER !== "smtp" || !process.env.SMTP_HOST)
        throw new Error("Email provider not configured");
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        requireTLS: process.env.NODE_ENV === "production",
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
        ...(process.env.SMTP_USER
          ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } }
          : {}),
      });
      await transport.sendMail({
        from: process.env.EMAIL_FROM,
        to: item.recipient,
        subject: item.subject,
        text: item.text,
      });
      await db.emailDelivery.update({
        where: { id: item.id },
        data: {
          status: "DELIVERED",
          deliveredAt: new Date(),
          attempts: { increment: 1 },
          lockedUntil: null,
        },
      });
    } catch {
      const attempts = item.attempts + 1;
      await db.emailDelivery.update({
        where: { id: item.id },
        data: {
          status: attempts >= 5 ? "FAILED" : "PENDING",
          attempts,
          availableAt: new Date(Date.now() + 60_000 * 2 ** attempts),
          lockedUntil: null,
        },
      });
    }
  }
  return items.length;
}
