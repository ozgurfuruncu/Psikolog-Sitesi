import { db } from "./db";
import type { Prisma, AppointmentStatus } from "../generated/prisma/client";
import { fail } from "./errors";
import { istanbulDate, localDate, addDays } from "./i18n";
import { productionGate } from "./env";

export type Actor = { id: string; role: string };
export const activeStatuses: AppointmentStatus[] = [
  "PENDING_APPROVAL",
  "ALTERNATIVE_PROPOSED",
  "AWAITING_PAYMENT",
  "CONFIRMED",
  "IN_PROGRESS",
];
type Tx = Prisma.TransactionClient;
export async function bookingLock(tx: Tx) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(71342)`;
}
export async function notify(
  tx: Tx,
  userId: string,
  kind: string,
  key: string,
  href = "/panel/randevular",
) {
  const labels: Record<string, string> = {
    REQUEST: "Randevu talebiniz alındı",
    APPROVED: "Randevu talebiniz onaylandı",
    ALTERNATIVE: "Yeni bir randevu saati önerildi",
    CONFIRMED: "Randevunuz kesinleşti",
    REJECTED: "Randevu talebiniz sonuçlandı",
    CANCELLED: "Randevunuz iptal edildi",
    COMPLETED: "Görüşmeniz tamamlandı",
    FEEDBACK: "Deneyiminizi özel olarak paylaşabilirsiniz",
    PAYMENT: "Ödeme işleminiz güncellendi",
    EXPIRED: "Randevu talebinizin süresi doldu",
    REMINDER: "Yaklaşan randevunuz var",
    WAITLIST: "Tercih ettiğiniz tarihte bir saat açıldı",
  };
  const title = labels[kind] || "Randevunuz güncellendi";
  await tx.notification.upsert({
    where: { dedupeKey: key },
    create: {
      userId,
      kind,
      title,
      body: "Ayrıntıları hesabınızdan güvenle görüntüleyebilirsiniz.",
      href,
      dedupeKey: key,
    },
    update: {},
  });
  const user = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    include: { preferences: true },
  });
  if (
    user.preferences?.email !== false &&
    (kind !== "REMINDER" || user.preferences?.reminders !== false)
  )
    await tx.emailDelivery.upsert({
      where: { dedupeKey: key },
      create: {
        recipient: user.email,
        subject: "Hesabınızda yeni bir bildirim var",
        text: `Hesabınızdaki bildirimi görüntüleyin: ${process.env.APP_URL}${href}`,
        dedupeKey: key,
      },
      update: {},
    });
}
async function audit(tx: Tx, actorId: string | null, action: string, resourceId: string) {
  await tx.auditLog.create({ data: { actorId, action, resourceId } });
}
export async function expireHolds(tx: Tx) {
  const expired = await tx.appointment.findMany({
    where: {
      status: { in: ["PENDING_APPROVAL", "ALTERNATIVE_PROPOSED", "AWAITING_PAYMENT"] },
      holdExpiresAt: { lt: new Date() },
    },
  });
  for (const a of expired) {
    await tx.appointment.update({
      where: { id: a.id },
      data: { status: "EXPIRED", holdExpiresAt: null },
    });
    await tx.appointmentStatusHistory.create({
      data: {
        appointmentId: a.id,
        fromStatus: a.status,
        toStatus: "EXPIRED",
        reason: "Reservation expired",
      },
    });
    await notify(tx, a.clientId, "EXPIRED", `expired:${a.id}`);
    await notifyWaitlist(tx, localDate(a.startsAt));
  }
}
async function notifyWaitlist(tx: Tx, date: string) {
  const entries = await tx.waitlistEntry.findMany({ where: { date, notifiedAt: null } });
  for (const entry of entries) {
    await notify(tx, entry.userId, "WAITLIST", `waitlist:${entry.id}`, "/randevu");
    await tx.waitlistEntry.update({ where: { id: entry.id }, data: { notifiedAt: new Date() } });
  }
}
export async function getSettings(tx: Tx = db) {
  return tx.siteSettings.upsert({
    where: { id: "primary" },
    create: { id: "primary" },
    update: {},
  });
}
export async function validateSlot(tx: Tx, startsAt: Date, duration: number, ignoreId?: string) {
  const settings = await getSettings(tx);
  if (
    !Number.isFinite(startsAt.getTime()) ||
    startsAt.getTime() < Date.now() + settings.bookingNoticeHours * 3600_000
  )
    fail("Bu saat için minimum randevu süresi dolmuş. Başka bir saat seçin.");
  if (startsAt.getTime() > Date.now() + 90 * 86400_000)
    fail("En fazla 90 gün sonrası için randevu alabilirsiniz.");
  const date = localDate(startsAt);
  const local = new Date(startsAt.getTime() + 3 * 3600_000);
  const minute = local.getUTCHours() * 60 + local.getUTCMinutes();
  if (startsAt.getUTCSeconds() !== 0 || startsAt.getUTCMilliseconds() !== 0 || minute % 30 !== 0)
    fail("Listelenen saatlerden birini seçin.");
  const end = new Date(startsAt.getTime() + duration * 60_000);
  const reservedUntil = new Date(end.getTime() + settings.bufferMinutes * 60_000);
  const custom = await tx.availabilityRule.findMany({ where: { date, active: true } });
  const rules = custom.length
    ? custom
    : await tx.availabilityRule.findMany({
        where: { date: null, dayOfWeek: local.getUTCDay(), active: true },
      });
  if (
    !rules.some(
      (r) => minute >= r.startMinute && minute + duration + settings.bufferMinutes <= r.endMinute,
    )
  )
    fail("Seçilen saat çalışma aralığının dışında.");
  const blocked = await tx.blockedTime.count({
    where: { startsAt: { lt: reservedUntil }, endsAt: { gt: startsAt } },
  });
  const overlap = await tx.appointment.count({
    where: {
      ...(ignoreId ? { id: { not: ignoreId } } : {}),
      status: { in: activeStatuses },
      startsAt: { lt: reservedUntil },
      reservedUntil: { gt: startsAt },
    },
  });
  if (blocked || overlap) fail("Bu saat artık müsait değil. Başka bir saat seçin.", 409);
  return { endsAt: end, reservedUntil, settings };
}
export async function availableSlots(serviceId: string, date: string) {
  if (date < localDate() || date > addDays(localDate(), 90)) return [];
  return db.$transaction(async (tx) => {
    await bookingLock(tx);
    await expireHolds(tx);
    const service = await tx.service.findFirst({ where: { id: serviceId, active: true } });
    if (!service) fail("Hizmet bulunamadı.", 404);
    const settings = await getSettings(tx);
    const weekday = new Date(`${date}T12:00:00+03:00`).getUTCDay();
    const custom = await tx.availabilityRule.findMany({ where: { date, active: true } });
    const rules = custom.length
      ? custom
      : await tx.availabilityRule.findMany({
          where: { date: null, dayOfWeek: weekday, active: true },
        });
    const dayStart = istanbulDate(date, 0),
      dayEnd = istanbulDate(addDays(date, 1), 0);
    const [appointments, blocked] = await Promise.all([
      tx.appointment.findMany({
        where: {
          status: { in: activeStatuses },
          startsAt: { lt: dayEnd },
          reservedUntil: { gt: dayStart },
        },
        select: { startsAt: true, reservedUntil: true },
      }),
      tx.blockedTime.findMany({
        where: { startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } },
        select: { startsAt: true, endsAt: true },
      }),
    ]);
    const slots = new Map<string, { startsAt: string; endsAt: string }>();
    for (const rule of rules)
      for (
        let minute = Math.ceil(rule.startMinute / 30) * 30;
        minute + service.durationMinutes + settings.bufferMinutes <= rule.endMinute;
        minute += 30
      ) {
        const start = istanbulDate(date, minute),
          end = new Date(start.getTime() + service.durationMinutes * 60_000),
          reserve = new Date(end.getTime() + settings.bufferMinutes * 60_000);
        if (start.getTime() < Date.now() + settings.bookingNoticeHours * 3600_000) continue;
        if (
          appointments.some((a) => a.startsAt < reserve && a.reservedUntil > start) ||
          blocked.some((b) => b.startsAt < reserve && b.endsAt > start)
        )
          continue;
        slots.set(start.toISOString(), {
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
        });
      }
    return [...slots.values()].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  });
}
export async function createAppointment(actor: Actor, serviceId: string, startsAt: Date) {
  productionGate();
  if (actor.role !== "CLIENT") fail("Randevular danışan hesabıyla oluşturulur.", 403);
  return db.$transaction(async (tx) => {
    await bookingLock(tx);
    await expireHolds(tx);
    const user = await tx.user.findUniqueOrThrow({ where: { id: actor.id } });
    if (!user.adultConfirmed || !user.emailVerified)
      fail("Yetişkin hesabı ve doğrulanmış e-posta gerekli.", 403);
    const service = await tx.service.findFirst({ where: { id: serviceId, active: true } });
    if (!service) fail("Hizmet bulunamadı.", 404);
    const { endsAt, reservedUntil, settings } = await validateSlot(
      tx,
      startsAt,
      service.durationMinutes,
    );
    const appointment = await tx.appointment.create({
      data: {
        clientId: actor.id,
        serviceId,
        startsAt,
        endsAt,
        reservedUntil,
        durationMinutes: service.durationMinutes,
        priceKurus: service.paymentRequired ? service.priceKurus : 0,
        currency: "TRY",
        cancellationHours: settings.cancellationHours,
        holdExpiresAt: new Date(
          Math.min(Date.now() + settings.holdHours * 3600_000, startsAt.getTime()),
        ),
        payment: {
          create: {
            amountKurus: service.paymentRequired ? service.priceKurus : 0,
            status: service.paymentRequired ? "PENDING" : "NOT_REQUIRED",
            provider: process.env.PAYMENT_PROVIDER || "mock",
          },
        },
        history: { create: { toStatus: "PENDING_APPROVAL", actorId: actor.id } },
        consents: {
          create: [
            {
              userId: actor.id,
              documentType: "INFORMED_CONSENT",
              documentVersion: settings.consentVersion,
            },
            { userId: actor.id, documentType: "PRIVACY", documentVersion: settings.privacyVersion },
            {
              userId: actor.id,
              documentType: "CANCELLATION",
              documentVersion: settings.privacyVersion,
            },
          ],
        },
      },
    });
    await audit(tx, actor.id, "APPOINTMENT_REQUESTED", appointment.id);
    await notify(tx, actor.id, "REQUEST", `request:${appointment.id}`);
    const admins = await tx.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    for (const admin of admins)
      await notify(
        tx,
        admin.id,
        "REQUEST",
        `admin-request:${appointment.id}:${admin.id}`,
        "/yonetim/randevular",
      );
    return appointment;
  });
}
export async function appointmentAction(
  actor: Actor,
  id: string,
  action: string,
  proposedStart?: Date,
) {
  return db.$transaction(async (tx) => {
    await bookingLock(tx);
    await expireHolds(tx);
    const a = await tx.appointment.findUnique({ where: { id }, include: { payment: true } });
    if (!a || (actor.role !== "ADMIN" && a.clientId !== actor.id)) fail("Randevu bulunamadı.", 404);
    const admin = actor.role === "ADMIN";
    const settings = await getSettings(tx);
    let status: AppointmentStatus = a.status;
    let kind = "UPDATED";
    const data: Prisma.AppointmentUpdateInput = {};
    const can = (allowed: AppointmentStatus[]) => {
      if (!allowed.includes(a.status)) fail("Randevunun mevcut durumu bu işleme uygun değil.", 409);
    };
    const adminOnly = () => {
      if (!admin) fail("Bu işlem için yetkiniz yok.", 403);
    };
    const acceptedStatus = (): AppointmentStatus =>
      a.payment?.status === "PAID" || a.payment?.status === "NOT_REQUIRED"
        ? "CONFIRMED"
        : "AWAITING_PAYMENT";
    switch (action) {
      case "approve":
        adminOnly();
        can(["PENDING_APPROVAL"]);
        status = acceptedStatus();
        kind = "APPROVED";
        break;
      case "reject":
        adminOnly();
        can(["PENDING_APPROVAL", "ALTERNATIVE_PROPOSED"]);
        status = "REJECTED";
        kind = "REJECTED";
        break;
      case "propose": {
        can(["PENDING_APPROVAL", "CONFIRMED", "AWAITING_PAYMENT", "ALTERNATIVE_PROPOSED"]);
        if (!admin && a.startsAt.getTime() - Date.now() < a.cancellationHours * 3600_000)
          fail("Değişiklik süresi doldu. Destek üzerinden iletişime geçin.");
        if (!proposedStart) fail("Yeni tarih ve saat seçin.");
        const slot = await validateSlot(tx, proposedStart, a.durationMinutes, a.id);
        await tx.alternativeAppointmentProposal.updateMany({
          where: { appointmentId: id, status: "PENDING" },
          data: { status: "SUPERSEDED" },
        });
        await tx.alternativeAppointmentProposal.create({
          data: {
            appointmentId: id,
            startsAt: proposedStart,
            endsAt: slot.endsAt,
            previousStartsAt: a.startsAt,
            previousEndsAt: a.endsAt,
            status: admin ? "PENDING" : "CLIENT_REQUESTED",
          },
        });
        data.startsAt = proposedStart;
        data.endsAt = slot.endsAt;
        data.reservedUntil = slot.reservedUntil;
        status = admin ? "ALTERNATIVE_PROPOSED" : "PENDING_APPROVAL";
        kind = admin ? "ALTERNATIVE" : "REQUEST";
        break;
      }
      case "accept":
        if (admin) fail("Bu yanıtı danışan vermelidir.", 403);
        can(["ALTERNATIVE_PROPOSED"]);
        status = acceptedStatus();
        kind = "CONFIRMED";
        await tx.alternativeAppointmentProposal.updateMany({
          where: { appointmentId: id, status: "PENDING" },
          data: { status: "ACCEPTED" },
        });
        break;
      case "decline":
        if (admin) fail("Bu yanıtı danışan vermelidir.", 403);
        can(["ALTERNATIVE_PROPOSED"]);
        status = "CANCELLED";
        kind = "CANCELLED";
        await tx.alternativeAppointmentProposal.updateMany({
          where: { appointmentId: id, status: "PENDING" },
          data: { status: "DECLINED" },
        });
        break;
      case "cancel":
        can(activeStatuses);
        if (!admin && a.startsAt.getTime() - Date.now() < a.cancellationHours * 3600_000)
          fail("İptal süresi doldu. Destek üzerinden iletişime geçin.");
        status = "CANCELLED";
        kind = "CANCELLED";
        break;
      case "start":
        adminOnly();
        can(["CONFIRMED"]);
        assertSessionWindow(a.startsAt, a.endsAt);
        status = "IN_PROGRESS";
        break;
      case "complete":
        adminOnly();
        can(["CONFIRMED", "IN_PROGRESS"]);
        if (Date.now() < a.startsAt.getTime()) fail("Gelecekteki görüşme tamamlanamaz.");
        status = "COMPLETED";
        kind = "COMPLETED";
        await tx.videoSession.updateMany({
          where: { appointmentId: id },
          data: { endedAt: new Date() },
        });
        break;
      case "no-show":
        adminOnly();
        can(["CONFIRMED", "IN_PROGRESS"]);
        if (Date.now() < a.endsAt.getTime())
          fail("Görüşme bitmeden katılmadı olarak işaretlenemez.");
        status = "NO_SHOW";
        break;
      default:
        fail("Geçersiz işlem.");
    }
    const start = data.startsAt instanceof Date ? data.startsAt : a.startsAt;
    data.status = status;
    data.holdExpiresAt = ["PENDING_APPROVAL", "ALTERNATIVE_PROPOSED", "AWAITING_PAYMENT"].includes(
      status,
    )
      ? new Date(
          Math.min(
            Date.now() +
              (status === "AWAITING_PAYMENT" ? settings.paymentHoldHours : settings.holdHours) *
                3600_000,
            start.getTime(),
          ),
        )
      : null;
    await tx.appointment.update({ where: { id }, data });
    await tx.appointmentStatusHistory.create({
      data: {
        appointmentId: id,
        fromStatus: a.status,
        toStatus: status,
        actorId: actor.id,
        reason: action,
      },
    });
    await audit(tx, actor.id, `APPOINTMENT_${action.toUpperCase()}`, id);
    if (["CANCELLED", "REJECTED"].includes(status)) {
      if (a.payment?.status === "PAID") {
        await tx.payment.update({
          where: { id: a.payment.id },
          data: { status: "REFUND_PENDING" },
        });
        await tx.refund.create({
          data: { paymentId: a.payment.id, amountKurus: a.payment.amountKurus },
        });
      }
      await notifyWaitlist(tx, localDate(a.startsAt));
    }
    await notify(tx, a.clientId, kind, `${action}:${id}:${Date.now()}`);
    if (status === "COMPLETED") {
      const preferences = await tx.notificationPreference.findUnique({
        where: { userId: a.clientId },
      });
      if (preferences?.feedbackInvitation !== false)
        await notify(
          tx,
          a.clientId,
          "FEEDBACK",
          `feedback-invitation:${id}`,
          `/panel/degerlendirmeler?appointment=${id}`,
        );
    }
    if (!admin && action === "propose")
      for (const user of await tx.user.findMany({ where: { role: "ADMIN" }, select: { id: true } }))
        await notify(
          tx,
          user.id,
          "REQUEST",
          `reschedule:${id}:${Date.now()}:${user.id}`,
          "/yonetim/randevular",
        );
    return tx.appointment.findUniqueOrThrow({ where: { id }, include: { payment: true } });
  });
}
export function assertSessionWindow(start: Date, end: Date) {
  if (Date.now() < start.getTime() - 10 * 60_000 || Date.now() > end.getTime() + 15 * 60_000)
    fail("Görüşme odası randevudan 10 dakika önce açılır, bitişten 15 dakika sonra kapanır.", 403);
}
export async function getOwnedAppointment(actor: Actor, id: string) {
  const a = await db.appointment.findFirst({
    where: { id, ...(actor.role === "ADMIN" ? {} : { clientId: actor.id }) },
    include: {
      service: true,
      client: { select: { id: true, name: true, email: true } },
      payment: { include: { refunds: true } },
      feedback: true,
      history: { orderBy: { createdAt: "desc" } },
      alternatives: true,
      video: true,
    },
  });
  if (!a) fail("Randevu bulunamadı.", 404);
  return a;
}
