import "dotenv/config";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import { bookingLock, activeStatuses } from "../src/lib/appointments";
if (process.env.NODE_ENV === "production" || process.env.DEMO_MODE !== "true")
  throw new Error("Demo session refresh is development-only.");
await db.$transaction(async (tx) => {
  await bookingLock(tx);
  const appointment = await tx.appointment.findUnique({ where: { id: "demo-live" } });
  if (!appointment || appointment.clientId !== "demo-client")
    throw new Error("Seed the development demo first.");
  const start = new Date(Date.now() - 2 * 60_000),
    end = new Date(Date.now() + 48 * 60_000),
    reservedUntil = new Date(Date.now() + 58 * 60_000);
  if (
    await tx.appointment.count({
      where: {
        id: { not: "demo-live" },
        status: { in: activeStatuses },
        startsAt: { lt: reservedUntil },
        reservedUntil: { gt: start },
      },
    })
  )
    throw new Error("Another active appointment occupies this range; no data was changed.");
  await tx.appointment.update({
    where: { id: appointment.id },
    data: { startsAt: start, endsAt: end, reservedUntil, status: "CONFIRMED", holdExpiresAt: null },
  });
  await tx.videoSession.upsert({
    where: { appointmentId: appointment.id },
    create: { appointmentId: appointment.id, roomId: randomUUID() },
    update: { endedAt: null, roomId: randomUUID() },
  });
  await tx.appointmentStatusHistory.create({
    data: {
      appointmentId: appointment.id,
      fromStatus: appointment.status,
      toStatus: "CONFIRMED",
      reason: "Development demo session refreshed",
    },
  });
});
console.log(
  "Fictional demo room is available now in both demo accounts. No real session service is enabled.",
);
await db.$disconnect();
