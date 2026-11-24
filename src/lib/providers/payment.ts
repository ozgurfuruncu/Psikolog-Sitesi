import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { db } from "../db";
import { fail } from "../errors";
import { isDemo, productionGate, appUrl } from "../env";
import { bookingLock, expireHolds, notify, type Actor } from "../appointments";

export interface CheckoutInput {
  paymentId: string;
  amountKurus: number;
  email: string;
  name: string;
  ip: string;
  identityNumber?: string;
  address?: string;
  city?: string;
}
export interface PaymentProvider {
  name: string;
  createCheckout(input: CheckoutInput): Promise<{ token: string; url: string }>;
}
export const paymentEventSchema = z.object({
  eventId: z.string().min(1).max(200),
  paymentId: z.string(),
  amountKurus: z.number().int().nonnegative(),
  currency: z.literal("TRY"),
  status: z.enum(["PAID", "FAILED"]),
  providerPaymentId: z.string(),
});
export type PaymentEvent = z.infer<typeof paymentEventSchema>;
export function signPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}
export function signaturesEqual(actual: string | null, expected: string) {
  return (
    !!actual &&
    /^[a-f0-9]{64}$/i.test(actual) &&
    timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"))
  );
}

export const mockPaymentProvider: PaymentProvider = {
  name: "mock",
  async createCheckout(input) {
    if (!isDemo()) fail("Geliştirme ödemesi bu ortamda kapalı.", 503);
    return { token: randomUUID(), url: `/panel/odemeler?payment=${input.paymentId}` };
  },
};
async function iyzicoRequest(path: string, body: Record<string, unknown>) {
  const key = process.env.IYZICO_API_KEY,
    secret = process.env.IYZICO_SECRET_KEY;
  if (!key || !secret) fail("iyzico sandbox anahtarları yapılandırılmamış.", 503);
  const base = process.env.IYZICO_BASE_URL || "https://sandbox-api.iyzipay.com";
  if (base !== "https://sandbox-api.iyzipay.com")
    fail("Bu sürüm yalnızca iyzico sandbox ortamını destekler.", 503);
  const random = randomUUID(),
    payload = JSON.stringify(body);
  const signature = signPayload(random + path + payload, secret);
  const authorization =
    "IYZWSv2 " +
    Buffer.from(`apiKey:${key}&randomKey:${random}&signature:${signature}`).toString("base64");
  const response = await fetch(base + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authorization,
      "x-iyzi-rnd": random,
    },
    body: payload,
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) fail("Ödeme sağlayıcısına ulaşılamadı.", 502);
  return response.json() as Promise<Record<string, unknown>>;
}
export const iyzicoSandboxProvider: PaymentProvider = {
  name: "iyzico",
  async createCheckout(input) {
    if (!input.identityNumber || !input.address || !input.city)
      fail("iyzico sandbox işlemi için gereken alıcı bilgileri eksik.", 422);
    const body = {
      locale: "tr",
      conversationId: input.paymentId,
      price: (input.amountKurus / 100).toFixed(2),
      paidPrice: (input.amountKurus / 100).toFixed(2),
      currency: "TRY",
      basketId: input.paymentId,
      paymentGroup: "PRODUCT",
      callbackUrl: `${appUrl}/api/payments/iyzico/callback`,
      enabledInstallments: [1],
      buyer: {
        id: input.paymentId,
        name: input.name.split(" ")[0],
        surname: input.name.split(" ").slice(1).join(" ") || input.name,
        email: input.email,
        identityNumber: input.identityNumber,
        registrationAddress: input.address,
        ip: input.ip,
        city: input.city,
        country: "Turkey",
      },
      billingAddress: {
        contactName: input.name,
        city: input.city,
        country: "Turkey",
        address: input.address,
      },
      basketItems: [
        {
          id: input.paymentId,
          name: "Randevu hizmeti",
          category1: "Hizmet",
          itemType: "VIRTUAL",
          price: (input.amountKurus / 100).toFixed(2),
        },
      ],
    };
    const result = await iyzicoRequest("/payment/iyzipos/checkoutform/initialize/auth/ecom", body);
    if (
      result.status !== "success" ||
      typeof result.token !== "string" ||
      typeof result.paymentPageUrl !== "string"
    )
      fail("Ödeme sayfası oluşturulamadı.", 502);
    const expected = signPayload(
      `${input.paymentId}:${result.token}`,
      process.env.IYZICO_SECRET_KEY!,
    );
    if (!signaturesEqual(typeof result.signature === "string" ? result.signature : null, expected))
      fail("Ödeme yanıtı doğrulanamadı.", 502);
    const url = new URL(result.paymentPageUrl);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".iyzipay.com"))
      fail("Geçersiz ödeme adresi.", 502);
    return { token: result.token, url: result.paymentPageUrl };
  },
};
export async function startCheckout(
  actor: Actor,
  paymentId: string,
  buyer: Partial<Pick<CheckoutInput, "identityNumber" | "address" | "city">> = {},
) {
  productionGate();
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"checkout:" + paymentId}))`;
      const p = await tx.payment.findFirst({
        where: { id: paymentId, appointment: { clientId: actor.id } },
        include: { appointment: { include: { client: true } } },
      });
      if (!p) fail("Ödeme bulunamadı.", 404);
      if (
        p.appointment.status !== "AWAITING_PAYMENT" ||
        !p.appointment.holdExpiresAt ||
        p.appointment.holdExpiresAt < new Date()
      )
        fail("Randevu ödeme için uygun değil.", 409);
      if (!["PENDING", "FAILED"].includes(p.status)) fail("Bu ödeme zaten işlenmiş.", 409);
      if (
        p.status === "PENDING" &&
        p.providerToken &&
        p.checkoutUrl &&
        p.updatedAt.getTime() > Date.now() - 10 * 60_000
      )
        return { token: p.providerToken, url: p.checkoutUrl };
      const provider =
        process.env.PAYMENT_PROVIDER === "iyzico" ? iyzicoSandboxProvider : mockPaymentProvider;
      const checkout = await provider.createCheckout({
        paymentId: p.id,
        amountKurus: p.amountKurus,
        email: p.appointment.client.email,
        name: p.appointment.client.name,
        ip: "127.0.0.1",
        ...buyer,
      });
      await tx.payment.update({
        where: { id: p.id },
        data: { provider: provider.name, providerToken: checkout.token, checkoutUrl: checkout.url },
      });
      return checkout;
    },
    { timeout: 30000 },
  );
}
export async function applyPaymentEvent(event: PaymentEvent, provider: string) {
  return db.$transaction(async (tx) => {
    await bookingLock(tx);
    await expireHolds(tx);
    const p = await tx.payment.findUnique({
      where: { id: event.paymentId },
      include: { appointment: true },
    });
    if (!p || p.provider !== provider) fail("Ödeme kaydı bulunamadı.", 404);
    if (p.amountKurus !== event.amountKurus || p.currency !== event.currency)
      fail("Ödeme tutarı doğrulanamadı.", 400);
    if (await tx.paymentEvent.findUnique({ where: { id: event.eventId } }))
      return { duplicate: true };
    if (p.status === "PAID") {
      if (p.providerPaymentId === event.providerPaymentId) return { duplicate: true };
      fail("Ödeme zaten tamamlanmış.", 409);
    }
    if (p.appointment.status !== "AWAITING_PAYMENT")
      fail("Randevunun ödeme süresi dolmuş veya durumu değişmiş.", 409);
    await tx.paymentEvent.create({ data: { id: event.eventId, paymentId: p.id } });
    await tx.payment.update({
      where: { id: p.id },
      data: {
        status: event.status,
        providerPaymentId: event.status === "PAID" ? event.providerPaymentId : null,
      },
    });
    if (event.status === "PAID") {
      await tx.appointment.update({
        where: { id: p.appointmentId },
        data: { status: "CONFIRMED", holdExpiresAt: null },
      });
      await tx.appointmentStatusHistory.create({
        data: {
          appointmentId: p.appointmentId,
          fromStatus: p.appointment.status,
          toStatus: "CONFIRMED",
          reason: "Verified payment",
        },
      });
    }
    await tx.auditLog.create({ data: { action: `PAYMENT_${event.status}`, resourceId: p.id } });
    await notify(
      tx,
      p.appointment.clientId,
      "PAYMENT",
      `payment:${event.eventId}`,
      "/panel/odemeler",
    );
    return { duplicate: false };
  });
}
export async function verifyMockWebhook(raw: string, signature: string | null) {
  if (!isDemo() || !process.env.MOCK_WEBHOOK_SECRET) fail("Geliştirme sağlayıcısı kapalı.", 503);
  if (!signaturesEqual(signature, signPayload(raw, process.env.MOCK_WEBHOOK_SECRET)))
    fail("İmza doğrulanamadı.", 401);
  return applyPaymentEvent(paymentEventSchema.parse(JSON.parse(raw)), "mock");
}
export async function retrieveIyzicoPayment(token: string) {
  const p = await db.payment.findUnique({ where: { providerToken: token } });
  if (!p || p.provider !== "iyzico") fail("Ödeme bulunamadı.", 404);
  const r = await iyzicoRequest("/payment/iyzipos/checkoutform/auth/ecom/detail", {
    locale: "tr",
    conversationId: p.id,
    token,
  });
  if (r.status !== "success") fail("Ödeme sonucu doğrulanamadı.", 502);
  const fields = [
    r.paymentStatus,
    r.paymentId,
    r.currency,
    r.basketId,
    r.conversationId,
    r.paidPrice,
    r.price,
    r.token,
  ].map(String);
  const expected = signPayload(fields.join(":"), process.env.IYZICO_SECRET_KEY!);
  if (!signaturesEqual(typeof r.signature === "string" ? r.signature : null, expected))
    fail("Ödeme yanıtının imzası geçersiz.", 401);
  if (
    r.conversationId !== p.id ||
    r.basketId !== p.id ||
    r.token !== p.providerToken ||
    r.currency !== "TRY" ||
    Math.round(Number(r.price) * 100) !== p.amountKurus ||
    Math.round(Number(r.paidPrice) * 100) !== p.amountKurus
  )
    fail("Ödeme tutarı veya işlem eşleşmedi.", 400);
  return applyPaymentEvent(
    {
      eventId: `iyzico:${r.paymentId}:${r.paymentStatus}`,
      paymentId: p.id,
      amountKurus: p.amountKurus,
      currency: "TRY",
      status: r.paymentStatus === "SUCCESS" ? "PAID" : "FAILED",
      providerPaymentId: String(r.paymentId),
    },
    "iyzico",
  );
}
export function verifyIyzicoWebhook(body: Record<string, unknown>, signature: string | null) {
  const secret = process.env.IYZICO_SECRET_KEY;
  if (!secret) fail("Ödeme sağlayıcısı yapılandırılmamış.", 503);
  const expected = signPayload(
    [
      secret,
      body.iyziEventType,
      body.iyziPaymentId,
      body.token,
      body.paymentConversationId,
      body.status,
    ]
      .map(String)
      .join(""),
    secret,
  );
  if (!signaturesEqual(signature, expected)) fail("İmza doğrulanamadı.", 401);
}
