import { db } from "./db";
import { bookingLock, expireHolds, getSettings, notify } from "./appointments";
import { deliverEmails } from "./mail";
export async function runJobs() {
  await db.$transaction(async (tx) => {
    await bookingLock(tx);
    await expireHolds(tx);
    const settings = await getSettings(tx);
    for (const hours of settings.reminderHours) {
      // If a worker was offline, send the nearest reminder rather than several at once.
      const lowerHours = Math.max(0, ...settings.reminderHours.filter((h) => h < hours));
      const appointments = await tx.appointment.findMany({
        where: {
          status: "CONFIRMED",
          startsAt: {
            gt: new Date(Date.now() + lowerHours * 3600_000),
            lte: new Date(Date.now() + hours * 3600_000),
          },
        },
        include: { client: { include: { preferences: true } } },
      });
      for (const a of appointments) {
        if (a.client.preferences?.reminders === false) continue;
        await notify(
          tx,
          a.clientId,
          "REMINDER",
          `reminder:${a.id}:${a.startsAt.toISOString()}:${hours}`,
        );
      }
    }
  });
  await deliverEmails();
  await db.verification.deleteMany({
    where: { expiresAt: { lt: new Date(Date.now() - 86400_000) } },
  });
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 86400_000) } } });
  return { ok: true };
}
