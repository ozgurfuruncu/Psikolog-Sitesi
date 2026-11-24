import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../src/lib/db";
import {
  availableSlots,
  createAppointment,
  appointmentAction,
  getOwnedAppointment,
  expireHolds,
  bookingLock,
} from "../src/lib/appointments";
import {
  applyPaymentEvent,
  verifyMockWebhook,
  signPayload,
  startCheckout,
} from "../src/lib/providers/payment";
import { mockVideoProvider, verifyVideoAccess } from "../src/lib/providers/video";
import { runJobs } from "../src/lib/jobs";
import { addDays, localDate } from "../src/lib/i18n";
import { randomUUID } from "node:crypto";
const client = { id: "test-client", role: "CLIENT" },
  other = { id: "test-other", role: "CLIENT" },
  admin = { id: "test-admin", role: "ADMIN" };
let appointmentId = "";
async function slot(service = "paid", offset = 5) {
  for (let i = offset; i < offset + 7; i++) {
    const slots = await availableSlots(service, addDays(localDate(), i));
    if (slots.length) return new Date(slots[0].startsAt);
  }
  throw new Error("No fixture slots");
}
beforeAll(async () => {
  for (const actor of [client, other, admin])
    await db.user.create({
      data: {
        id: actor.id,
        name: "Fictional test",
        email: `${actor.id}@example.test`,
        role: actor.role as "CLIENT" | "ADMIN",
        emailVerified: true,
        adultConfirmed: true,
      },
    });
  await db.siteSettings.create({ data: { id: "primary" } });
  await db.service.createMany({
    data: [
      {
        id: "paid",
        name: "Test paid",
        description: "Test only",
        durationMinutes: 50,
        priceKurus: 120000,
        paymentRequired: true,
      },
      {
        id: "free",
        name: "Test free",
        description: "Test only",
        durationMinutes: 30,
        priceKurus: 0,
        paymentRequired: false,
      },
    ],
  });
  await db.availabilityRule.createMany({
    data: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      startMinute: 540,
      endMinute: 1080,
    })),
  });
});
describe.sequential("Transactional appointments and ownership", () => {
  it("creates a persisted appointment with price, consent and audit snapshots", async () => {
    const a = await createAppointment(client, "paid", await slot());
    appointmentId = a.id;
    const p = await db.appointment.findUniqueOrThrow({
      where: { id: a.id },
      include: { consents: true, payment: true, history: true },
    });
    expect(p.status).toBe("PENDING_APPROVAL");
    expect(p.priceKurus).toBe(120000);
    expect(p.consents).toHaveLength(3);
    expect(p.history).toHaveLength(1);
    expect(p.payment?.status).toBe("PENDING");
  });
  it("rejects dates in the past and invalid working times", async () => {
    await expect(
      createAppointment(client, "paid", new Date(Date.now() - 3600_000)),
    ).rejects.toThrow();
    const date = new Date(await slot());
    date.setUTCHours(23);
    await expect(createAppointment(client, "paid", date)).rejects.toThrow();
  });
  it("prevents client approval and another client's IDOR access", async () => {
    await expect(appointmentAction(client, appointmentId, "approve")).rejects.toThrow();
    await expect(getOwnedAppointment(other, appointmentId)).rejects.toThrow();
    await expect(appointmentAction(other, appointmentId, "cancel")).rejects.toThrow();
  });
  it("hides occupied slots without returning identities", async () => {
    const a = await db.appointment.findUniqueOrThrow({ where: { id: appointmentId } });
    const slots = await availableSlots("paid", localDate(a.startsAt));
    expect(slots.some((s) => s.startsAt === a.startsAt.toISOString())).toBe(false);
    expect(JSON.stringify(slots)).not.toContain("test-client");
  });
  it("allows exactly one concurrent request for a slot", async () => {
    const date = await slot("paid", 8);
    const results = await Promise.allSettled([
      createAppointment(client, "paid", date),
      createAppointment(other, "paid", date),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
  });
  it("enforces overlapping ranges at database level without the service layer", async () => {
    const a = await db.appointment.findUniqueOrThrow({ where: { id: appointmentId } });
    await expect(
      db.appointment.create({
        data: {
          clientId: other.id,
          serviceId: "paid",
          startsAt: new Date(a.startsAt.getTime() + 15 * 60_000),
          endsAt: new Date(a.endsAt.getTime() + 15 * 60_000),
          reservedUntil: new Date(a.reservedUntil.getTime() + 15 * 60_000),
          priceKurus: 120000,
          durationMinutes: 50,
        },
      }),
    ).rejects.toThrow();
  });
  it("approves a request and requires payment", async () => {
    const a = await appointmentAction(admin, appointmentId, "approve");
    expect(a.status).toBe("AWAITING_PAYMENT");
  });
  it("proposes and accepts a new time with an audit trail", async () => {
    const p = await db.payment.findUniqueOrThrow({ where: { appointmentId } });
    const checkouts = await Promise.all([startCheckout(client, p.id), startCheckout(client, p.id)]);
    expect(checkouts[0].token).toBe(checkouts[1].token);
    const start = await slot("paid", 10);
    const a = await appointmentAction(admin, appointmentId, "propose", start);
    expect(a.status).toBe("ALTERNATIVE_PROPOSED");
    const accepted = await appointmentAction(client, appointmentId, "accept");
    expect(accepted.status).toBe("AWAITING_PAYMENT");
    expect(
      (await db.alternativeAppointmentProposal.findFirstOrThrow({ where: { appointmentId } }))
        .status,
    ).toBe("ACCEPTED");
  });
  it("rejects bad webhook signatures and amount mismatches", async () => {
    await expect(verifyMockWebhook("{}", "bad")).rejects.toThrow();
    const p = await db.payment.findUniqueOrThrow({ where: { appointmentId } });
    await expect(
      applyPaymentEvent(
        {
          eventId: randomUUID(),
          paymentId: p.id,
          amountKurus: 1,
          currency: "TRY",
          status: "PAID",
          providerPaymentId: "bad",
        },
        "mock",
      ),
    ).rejects.toThrow();
  });
  it("handles failed payment, verified retry and duplicate webhooks idempotently", async () => {
    const p = await db.payment.findUniqueOrThrow({ where: { appointmentId } });
    const failed = {
      eventId: randomUUID(),
      paymentId: p.id,
      amountKurus: p.amountKurus,
      currency: "TRY" as const,
      status: "FAILED" as const,
      providerPaymentId: "failed",
    };
    await applyPaymentEvent(failed, "mock");
    expect((await db.payment.findUniqueOrThrow({ where: { id: p.id } })).status).toBe("FAILED");
    const paid = {
      ...failed,
      eventId: randomUUID(),
      status: "PAID" as const,
      providerPaymentId: `mock-${p.id}`,
    };
    const raw = JSON.stringify(paid);
    await verifyMockWebhook(raw, signPayload(raw, process.env.MOCK_WEBHOOK_SECRET!));
    expect((await db.appointment.findUniqueOrThrow({ where: { id: appointmentId } })).status).toBe(
      "CONFIRMED",
    );
    expect((await applyPaymentEvent(paid, "mock")).duplicate).toBe(true);
    expect(await db.paymentEvent.count({ where: { paymentId: p.id } })).toBe(2);
  });
  it("restricts video access by identity, time, expiry and signature", async () => {
    await expect(mockVideoProvider.issueAccess(other, appointmentId)).rejects.toThrow();
    await expect(mockVideoProvider.issueAccess(client, appointmentId)).rejects.toThrow();
    await expect(verifyVideoAccess(client, "tampered.signature")).rejects.toThrow();
  });
  it("supports client rescheduling, rejection and slot release", async () => {
    const a = await createAppointment(client, "free", await slot("free", 15));
    await appointmentAction(admin, a.id, "approve");
    const proposed = await appointmentAction(client, a.id, "propose", await slot("free", 17));
    expect(proposed.status).toBe("PENDING_APPROVAL");
    const rejected = await appointmentAction(admin, a.id, "reject");
    expect(rejected.status).toBe("REJECTED");
    const slots = await availableSlots("free", localDate(rejected.startsAt));
    expect(slots.some((s) => s.startsAt === rejected.startsAt.toISOString())).toBe(true);
  });
  it("releases expired slot holds", async () => {
    const a = await createAppointment(client, "paid", await slot("paid", 20));
    await db.appointment.update({
      where: { id: a.id },
      data: { holdExpiresAt: new Date(Date.now() - 1000) },
    });
    await db.$transaction(async (tx) => {
      await bookingLock(tx);
      await expireHolds(tx);
    });
    expect((await db.appointment.findUniqueOrThrow({ where: { id: a.id } })).status).toBe(
      "EXPIRED",
    );
    expect(
      (await availableSlots("paid", localDate(a.startsAt))).some(
        (s) => s.startsAt === a.startsAt.toISOString(),
      ),
    ).toBe(true);
  });
  it("cancels paid bookings and creates a separate refund request", async () => {
    const a = await appointmentAction(client, appointmentId, "cancel");
    expect(a.status).toBe("CANCELLED");
    const p = await db.payment.findUniqueOrThrow({
      where: { appointmentId },
      include: { refunds: true },
    });
    expect(p.status).toBe("REFUND_PENDING");
    expect(p.refunds).toHaveLength(1);
  });
  it("enforces one private feedback per completed appointment", async () => {
    const a = await createAppointment(client, "free", await slot("free", 25));
    await appointmentAction(admin, a.id, "approve");
    await db.appointment.update({
      where: { id: a.id },
      data: {
        startsAt: new Date(Date.now() - 10 * 60_000),
        endsAt: new Date(Date.now() + 20 * 60_000),
        reservedUntil: new Date(Date.now() + 30 * 60_000),
      },
    });
    const access = await mockVideoProvider.issueAccess(client, a.id);
    expect((await verifyVideoAccess(client, access.token)).userId).toBe(client.id);
    await expect(verifyVideoAccess(other, access.token)).rejects.toThrow();
    await appointmentAction(admin, a.id, "start");
    await appointmentAction(admin, a.id, "complete");
    await expect(verifyVideoAccess(client, access.token)).rejects.toThrow();
    const f = {
      appointmentId: a.id,
      overall: 4,
      communication: 4,
      booking: 5,
      technical: 5,
      comment: "Private fictional feedback",
    };
    await db.feedback.create({ data: f });
    await expect(db.feedback.create({ data: f })).rejects.toThrow();
  });
  it("deduplicates reminders and tracks email preview delivery", async () => {
    const a = await createAppointment(client, "free", await slot("free", 28));
    await appointmentAction(admin, a.id, "approve");
    await db.appointment.update({
      where: { id: a.id },
      data: {
        startsAt: new Date(Date.now() + 50 * 60_000),
        endsAt: new Date(Date.now() + 80 * 60_000),
        reservedUntil: new Date(Date.now() + 90 * 60_000),
      },
    });
    await runJobs();
    const before = await db.notification.count({ where: { kind: "REMINDER" } });
    await runJobs();
    expect(await db.notification.count({ where: { kind: "REMINDER" } })).toBe(before);
    expect(before).toBeGreaterThan(0);
    expect(await db.emailDelivery.count({ where: { status: "PREVIEW" } })).toBeGreaterThan(0);
  });
});
afterAll(() => db.$disconnect());
