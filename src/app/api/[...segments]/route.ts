import { db } from "@/lib/db";
import { z } from "zod";
import { requireUser, assertOrigin, rateLimit, currentUser } from "@/lib/guards";
import { apiError, fail } from "@/lib/errors";
import {
  availableSlots,
  createAppointment,
  appointmentAction,
  getOwnedAppointment,
  bookingLock,
  activeStatuses,
} from "@/lib/appointments";
import {
  dateSchema,
  bookingSchema,
  actionSchema,
  feedbackSchema,
  supportSchema,
  serviceSchema,
  settingsSchema,
  profileSchema,
  websiteSchema,
} from "@/lib/validation";
import { requireDemo, isIsolatedTest, isReview } from "@/lib/env";
import {
  startCheckout,
  verifyMockWebhook,
  signPayload,
  retrieveIyzicoPayment,
  verifyIyzicoWebhook,
} from "@/lib/providers/payment";
import { mockVideoProvider, verifyVideoAccess } from "@/lib/providers/video";
import { storeFile, loadFile, checkFileSignature, signedFileUrl } from "@/lib/files";
import { runJobs } from "@/lib/jobs";
import { randomUUID } from "node:crypto";
import { setupAdministrator } from "@/lib/setup";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ segments: string[] }> };
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(request: Request, context: Context) {
  try {
    const { segments: s } = await context.params,
      url = new URL(request.url);
    if (s[0] === "availability") {
      await rateLimit("availability", 300);
      return json(
        await availableSlots(
          z.string().min(1).parse(url.searchParams.get("serviceId")),
          dateSchema.parse(url.searchParams.get("date")),
        ),
      );
    }
    if (s[0] === "services")
      return json(
        await db.service.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
      );
    if (s[0] === "files" && s[1]) {
      const user = await currentUser();
      if (user?.role !== "ADMIN") {
        if (!checkFileSignature(s[1], url)) fail("Dosya erişim süresi doldu.", 403);
        const [certificate, post, profile, branding] = await Promise.all([
          db.certificate.findFirst({
            where: { fileId: s[1], published: true, redactionConfirmed: true },
          }),
          db.blogPost.findFirst({ where: { imageFileId: s[1], published: true, reviewed: true } }),
          db.psychologistProfile.findFirst({ where: { photoFileId: s[1] } }),
          db.siteSettings.findFirst({
            where: { OR: [{ logoFileId: s[1] }, { faviconFileId: s[1] }] },
          }),
        ]);
        if (!certificate && !post && !profile && !branding) fail("Dosya bulunamadı.", 404);
      }
      const { file, bytes } = await loadFile(s[1]);
      return new Response(bytes, {
        headers: {
          "Content-Type": file.mimeType,
          "Content-Disposition": `inline; filename="document.${file.mimeType === "application/pdf" ? "pdf" : file.mimeType === "image/png" ? "png" : "jpg"}"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": "sandbox; default-src 'none'; frame-ancestors 'self'",
          "X-Frame-Options": "SAMEORIGIN",
        },
      });
    }
    if (s[0] === "dev" && s[1] === "mailbox") {
      requireDemo();
      await requireUser(true);
      return json(await db.emailDelivery.findMany({ take: 50, orderBy: { createdAt: "desc" } }));
    }
    const user = await requireUser(s[0] === "admin");
    if (s[0] === "me") return json(user);
    if (s[0] === "appointments") {
      if (s[1]) {
        const a = await getOwnedAppointment(user, s[1]);
        if (s[2] === "ics") {
          if (!["CONFIRMED", "IN_PROGRESS"].includes(a.status))
            fail("Takvime yalnızca onaylı randevular eklenebilir.");
          const stamp = (d: Date) =>
            d
              .toISOString()
              .replace(/[-:]/g, "")
              .replace(/\.\d{3}/, "");
          return new Response(
            [
              "BEGIN:VCALENDAR",
              "VERSION:2.0",
              "PRODID:-//Appointment Platform//Appointments//TR",
              "CALSCALE:GREGORIAN",
              "BEGIN:VEVENT",
              `UID:${a.id}@appointments`,
              `DTSTAMP:${stamp(new Date())}`,
              `DTSTART:${stamp(a.startsAt)}`,
              `DTEND:${stamp(a.endsAt)}`,
              "SUMMARY:Özel randevu",
              `DESCRIPTION:Ayrıntılar için hesabınıza giriş yapın.`,
              "END:VEVENT",
              "END:VCALENDAR",
              "",
            ].join("\r\n"),
            {
              headers: {
                "Content-Type": "text/calendar; charset=utf-8",
                "Content-Disposition": "attachment; filename=randevu.ics",
                "Cache-Control": "private, no-store",
              },
            },
          );
        }
        return json(a);
      }
      return json(
        await db.appointment.findMany({
          where: user.role === "ADMIN" ? {} : { clientId: user.id },
          include: {
            service: true,
            payment: true,
            feedback: true,
            ...(user.role === "ADMIN" ? { client: { select: { name: true, email: true } } } : {}),
          },
          orderBy: { startsAt: "desc" },
          take: 200,
        }),
      );
    }
    if (s[0] === "notifications")
      return json(
        await db.notification.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
      );
    if (s[0] === "profile")
      return json(
        await db.user.findUnique({
          where: { id: user.id },
          select: { name: true, email: true, profile: true, preferences: true, dataRequests: true },
        }),
      );
    if (s[0] === "data-export") {
      const data = await db.user.findUnique({
        where: { id: user.id },
        select: {
          name: true,
          email: true,
          createdAt: true,
          profile: true,
          preferences: true,
          appointments: {
            include: { service: true, payment: true, feedback: true, history: true },
          },
          consents: true,
          dataRequests: true,
          waitlist: true,
        },
      });
      await db.auditLog.create({
        data: { actorId: user.id, action: "DATA_EXPORTED", resourceId: user.id },
      });
      return new Response(JSON.stringify(data, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": "attachment; filename=verilerim.json",
          "Cache-Control": "private, no-store",
        },
      });
    }
    if (s[0] === "admin" && s[1] === "clients")
      return json(
        await db.user.findMany({
          where: { role: "CLIENT" },
          select: {
            id: true,
            name: true,
            email: true,
            profile: true,
            consents: true,
            _count: { select: { appointments: true } },
          },
          take: 200,
          orderBy: { createdAt: "desc" },
        }),
      );
    fail("Sayfa bulunamadı.", 404);
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    const { segments: s } = await context.params;
    if (s[0] === "payments" && s[1] === "mock-webhook") {
      if (Number(request.headers.get("content-length") || 0) > 10000) fail("İstek çok büyük.", 413);
      return json(
        await verifyMockWebhook(await request.text(), request.headers.get("x-mock-signature")),
      );
    }
    if (s[0] === "payments" && s[1] === "iyzico") {
      if (s[2] === "callback") {
        const form = await request.formData();
        await retrieveIyzicoPayment(z.string().min(1).max(300).parse(form.get("token")));
        return Response.redirect(new URL("/panel/odemeler", process.env.APP_URL), 303);
      }
      if (s[2] === "webhook") {
        const body = await request.json();
        verifyIyzicoWebhook(body, request.headers.get("x-iyz-signature-v3"));
        await retrieveIyzicoPayment(z.string().min(1).max(300).parse(body.token));
        return json({ ok: true });
      }
    }
    if (s[0] === "jobs") {
      if (
        !process.env.JOB_SECRET ||
        request.headers.get("authorization") !== `Bearer ${process.env.JOB_SECRET}`
      )
        fail("Yetkisiz istek.", 401);
      return json(await runJobs());
    }
    assertOrigin(request);
    if (Number(request.headers.get("content-length") || 0) > 6 * 1024 * 1024)
      fail("İstek çok büyük.", 413);
    if (s[0] === "setup") {
      await rateLimit("initial-admin-setup", 5, 3600_000);
      await setupAdministrator(await request.json());
      return json({ ok: true }, 201);
    }
    if (s[0] === "support") {
      if (
        process.env.NODE_ENV === "production" &&
        !isIsolatedTest() &&
        !isReview() &&
        process.env.PRODUCTION_LEGAL_APPROVED !== "true"
      )
        fail("İletişim formu henüz hizmete açılmadı.", 503);
      await rateLimit("support", 15, 3600_000);
      const data = supportSchema.parse(await request.json());
      await db.supportRequest.create({ data });
      return json({ ok: true }, 201);
    }
    const user = await requireUser(s[0] === "admin");
    await rateLimit(`mutation:${user.id}`, 60);
    if (s[0] === "files") {
      if (user.role !== "ADMIN") fail("Bu işlem için yetkiniz yok.", 403);
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) fail("Bir dosya seçin.");
      const saved = await storeFile(file, "certificate");
      await db.auditLog.create({
        data: { actorId: user.id, action: "FILE_UPLOADED", resourceId: saved.id },
      });
      return json({ id: saved.id, url: signedFileUrl(saved.id) }, 201);
    }
    const body = await request.json();
    if (s[0] === "admin" && s[1] === "review-session") {
      requireDemo();
      const { appointmentId } = z.object({ appointmentId: z.string().min(1).max(100) }).parse(body);
      await db.$transaction(async (tx) => {
        await bookingLock(tx);
        const a = await tx.appointment.findUnique({
          where: { id: appointmentId },
          include: { client: true, payment: true },
        });
        if (
          !a ||
          !a.client.email.endsWith("@example.test") ||
          !["CONFIRMED", "IN_PROGRESS"].includes(a.status) ||
          (a.payment?.provider !== "mock" && a.payment?.status !== "NOT_REQUIRED")
        )
          fail("Yalnızca onaylı kurgusal demo randevusu hazırlanabilir.", 409);
        const startsAt = new Date(Date.now() - 2 * 60_000);
        const endsAt = new Date(startsAt.getTime() + a.durationMinutes * 60_000);
        const settings = await tx.siteSettings.findUniqueOrThrow({ where: { id: "primary" } });
        const reservedUntil = new Date(endsAt.getTime() + settings.bufferMinutes * 60_000);
        if (
          await tx.appointment.count({
            where: {
              id: { not: a.id },
              status: { in: activeStatuses },
              startsAt: { lt: reservedUntil },
              reservedUntil: { gt: startsAt },
            },
          })
        )
          fail("Bu aralıkta başka bir demo randevusu var. Önce mevcut demoyu tamamlayın.", 409);
        await tx.appointment.update({
          where: { id: a.id },
          data: { startsAt, endsAt, reservedUntil, status: "CONFIRMED" },
        });
        await tx.videoSession.upsert({
          where: { appointmentId: a.id },
          create: { appointmentId: a.id, roomId: randomUUID(), provider: "mock" },
          update: { endedAt: null, roomId: randomUUID() },
        });
        await tx.auditLog.create({
          data: { actorId: user.id, action: "REVIEW_SESSION_PREPARED", resourceId: a.id },
        });
      });
      return json({ ok: true });
    }
    if (s[0] === "appointments") {
      if (!s[1]) {
        const data = bookingSchema.parse(body);
        return json(await createAppointment(user, data.serviceId, new Date(data.startsAt)), 201);
      }
      if (s[2] === "feedback") {
        const a = await getOwnedAppointment(user, s[1]);
        if (a.clientId !== user.id || a.status !== "COMPLETED")
          fail("Yalnızca tamamlanan kendi görüşmeniz için değerlendirme yapabilirsiniz.", 403);
        const feedback = await db.feedback.create({
          data: { appointmentId: a.id, ...feedbackSchema.parse(body) },
        });
        await db.auditLog.create({
          data: { actorId: user.id, action: "FEEDBACK_SUBMITTED", resourceId: a.id },
        });
        return json(feedback, 201);
      }
      if (s[2] === "video") return json(await mockVideoProvider.issueAccess(user, s[1]));
      if (s[2] === "video-check")
        return json(await verifyVideoAccess(user, z.string().parse(body.token)));
      const data = actionSchema.parse(body);
      return json(
        await appointmentAction(
          user,
          s[1],
          data.action,
          data.startsAt ? new Date(data.startsAt) : undefined,
        ),
      );
    }
    if (s[0] === "payments" && s[1]) {
      if (s[2] === "checkout")
        return json(
          await startCheckout(
            user,
            s[1],
            z
              .object({
                identityNumber: z
                  .string()
                  .regex(/^\d{11}$/)
                  .optional(),
                address: z.string().max(300).optional(),
                city: z.string().max(100).optional(),
              })
              .parse(body),
          ),
        );
      if (s[2] === "mock") {
        requireDemo();
        const p = await db.payment.findFirst({
          where: { id: s[1], provider: "mock", appointment: { clientId: user.id } },
        });
        if (!p) fail("Ödeme bulunamadı.", 404);
        await startCheckout(user, p.id);
        const { outcome } = z.object({ outcome: z.enum(["PAID", "FAILED"]) }).parse(body);
        const payload = JSON.stringify({
          eventId: randomUUID(),
          paymentId: p.id,
          amountKurus: p.amountKurus,
          currency: p.currency,
          status: outcome,
          providerPaymentId: `mock-${p.id}`,
        });
        if (!process.env.MOCK_WEBHOOK_SECRET) fail("Geliştirme anahtarı eksik.", 503);
        return json(
          await verifyMockWebhook(payload, signPayload(payload, process.env.MOCK_WEBHOOK_SECRET)),
        );
      }
      if (s[2] === "refund") {
        const p = await db.payment.findFirst({
          where: { id: s[1], appointment: { clientId: user.id, status: "CANCELLED" } },
          include: { refunds: true },
        });
        if (!p) fail("İade edilebilir ödeme bulunamadı.", 404);
        if (p.status === "REFUND_PENDING" || p.status === "REFUNDED") return json({ ok: true });
        if (p.status !== "PAID") fail("Ödeme iade için uygun değil.");
        await db.$transaction([
          db.payment.update({ where: { id: p.id }, data: { status: "REFUND_PENDING" } }),
          db.refund.create({ data: { paymentId: p.id, amountKurus: p.amountKurus } }),
        ]);
        return json({ ok: true });
      }
    }
    if (s[0] === "notifications") {
      await db.notification.updateMany({
        where: { userId: user.id, ...(s[1] ? { id: s[1] } : {}) },
        data: { readAt: new Date() },
      });
      return json({ ok: true });
    }
    if (s[0] === "profile") {
      const data = z
        .object({
          name: z.string().trim().min(2).max(100),
          phone: z.string().max(30).default(""),
          emailNotifications: z.boolean(),
          reminders: z.boolean(),
          feedbackInvitation: z.boolean(),
        })
        .parse(body);
      await db.$transaction([
        db.user.update({ where: { id: user.id }, data: { name: data.name } }),
        db.clientProfile.upsert({
          where: { userId: user.id },
          create: { userId: user.id, phone: data.phone },
          update: { phone: data.phone },
        }),
        db.notificationPreference.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            email: data.emailNotifications,
            reminders: data.reminders,
            feedbackInvitation: data.feedbackInvitation,
          },
          update: {
            email: data.emailNotifications,
            reminders: data.reminders,
            feedbackInvitation: data.feedbackInvitation,
          },
        }),
      ]);
      return json({ ok: true });
    }
    if (s[0] === "data-requests") {
      const data = z
        .object({
          type: z.enum(["ACCESS", "CORRECTION", "DELETION"]),
          details: z.string().max(2000).default(""),
        })
        .parse(body);
      await db.dataRequest.create({ data: { ...data, userId: user.id } });
      return json({ ok: true }, 201);
    }
    if (s[0] === "waitlist") {
      const { date } = z.object({ date: dateSchema }).parse(body);
      await db.waitlistEntry.upsert({
        where: { userId_date: { userId: user.id, date } },
        create: { userId: user.id, date },
        update: { notifiedAt: null },
      });
      return json({ ok: true }, 201);
    }
    if (s[0] === "admin") {
      const id = z.string().optional().parse(body.id);
      await db.auditLog.create({
        data: {
          actorId: user.id,
          action: `ADMIN_WRITE_ATTEMPT_${s[1]}`,
          resourceId: id || s[1] || "unknown",
        },
      });
      if (s[1] === "profile-photo") {
        const { fileId } = z.object({ fileId: z.string() }).parse(body);
        const file = await db.privateFile.findUnique({ where: { id: fileId } });
        if (!file || !["image/png", "image/jpeg"].includes(file.mimeType))
          fail("Geçerli bir fotoğraf dosyası yükleyin.");
        await db.psychologistProfile.update({
          where: { id: "primary" },
          data: { photoFileId: fileId },
        });
        return json({ ok: true });
      }
      if (s[1] === "branding") {
        const { field, fileId } = z
          .object({
            field: z.enum(["logoFileId", "faviconFileId"]),
            fileId: z.string().nullable(),
          })
          .parse(body);
        if (fileId) {
          const file = await db.privateFile.findUnique({ where: { id: fileId } });
          if (!file || !["image/png", "image/jpeg"].includes(file.mimeType))
            fail("PNG veya JPEG görseli yükleyin.");
        }
        await db.siteSettings.upsert({
          where: { id: "primary" },
          create: { [field]: fileId },
          update: { [field]: fileId },
        });
        return json({ ok: true });
      }
      if (s[1] === "website") {
        const data = websiteSchema.parse(body);
        return json(
          await db.siteSettings.upsert({ where: { id: "primary" }, create: data, update: data }),
        );
      }
      if (s[1] === "services") {
        const data = serviceSchema.parse(body);
        return json(
          id ? await db.service.update({ where: { id }, data }) : await db.service.create({ data }),
          id ? 200 : 201,
        );
      }
      if (s[1] === "site-content") {
        const data = z
          .object({
            key: z.enum(["home-introduction", "home-note", "contact-info"]),
            title: z.string().min(2).max(200),
            body: z.string().max(5000),
            published: z.boolean(),
          })
          .parse(body);
        return json(
          id
            ? await db.siteContent.update({ where: { id }, data })
            : await db.siteContent.create({ data }),
        );
      }
      if (s[1] === "settings") {
        return json(
          await db.siteSettings.upsert({
            where: { id: "primary" },
            create: settingsSchema.parse(body),
            update: settingsSchema.parse(body),
          }),
        );
      }
      if (s[1] === "profile") {
        const data = profileSchema.parse(body);
        return json(
          await db.psychologistProfile.upsert({
            where: { id: "primary" },
            create: data,
            update: data,
          }),
        );
      }
      if (s[1] === "faqs") {
        const data = z
          .object({
            question: z.string().min(3).max(300),
            answer: z.string().min(3).max(4000),
            published: z.boolean(),
            order: z.number().int().min(0),
          })
          .parse(body);
        return json(
          id ? await db.fAQ.update({ where: { id }, data }) : await db.fAQ.create({ data }),
        );
      }
      if (s[1] === "blog") {
        const data = z
          .object({
            title: z.string().min(3).max(200),
            slug: z.string().regex(/^[a-z0-9-]+$/),
            excerpt: z.string().max(500),
            content: z.string().max(50000),
            categoryId: z.string().nullable().optional(),
            seoTitle: z.string().max(200).optional(),
            seoDescription: z.string().max(500).optional(),
            imageFileId: z.string().nullable().optional(),
            published: z.boolean(),
            reviewed: z.boolean(),
          })
          .parse(body);
        if (data.published && !data.reviewed) fail("Yayın öncesi uzman incelemesi gerekli.");
        if (data.imageFileId) {
          const file = await db.privateFile.findUnique({ where: { id: data.imageFileId } });
          if (!file || !["image/png", "image/jpeg"].includes(file.mimeType))
            fail("Geçerli bir kapak görseli yükleyin.");
        }
        return json(
          id
            ? await db.blogPost.update({
                where: { id },
                data: { ...data, publishedAt: data.published ? new Date() : null },
              })
            : await db.blogPost.create({
                data: { ...data, publishedAt: data.published ? new Date() : null },
              }),
        );
      }
      if (s[1] === "categories") {
        const data = z.object({ name: z.string().min(2).max(100) }).parse(body);
        return json(await db.blogCategory.create({ data }));
      }
      if (s[1] === "announcements") {
        const data = z
          .object({
            title: z.string().min(3).max(150),
            body: z.string().max(3000),
            published: z.boolean(),
          })
          .parse(body);
        return json(
          id
            ? await db.announcement.update({ where: { id }, data })
            : await db.announcement.create({ data }),
        );
      }
      if (s[1] === "education") {
        const data = z
          .object({
            institution: z.string().min(2).max(200),
            qualification: z.string().min(2).max(200),
            department: z.string().max(200).default(""),
            degree: z.string().max(100).default(""),
            year: z.number().int().min(1950).max(2100).nullable(),
            published: z.boolean(),
            order: z.number().int().min(0),
          })
          .parse(body);
        return json(
          id
            ? await db.education.update({ where: { id }, data })
            : await db.education.create({ data }),
        );
      }
      if (s[1] === "certificates") {
        const data = z
          .object({
            title: z.string().min(2).max(200),
            institution: z.string().min(2).max(200),
            completedAt: z.iso.datetime().nullable().optional(),
            description: z.string().max(3000),
            fileId: z.string().nullable(),
            verificationUrl: z
              .union([
                z.url().refine((u) => u.startsWith("https://"), "Bağlantı HTTPS olmalı."),
                z.literal(""),
              ])
              .nullable(),
            published: z.boolean(),
            redactionConfirmed: z.boolean(),
            isPlaceholder: z.boolean(),
            order: z.number().int().min(0),
          })
          .parse(body);
        if (data.published && !data.redactionConfirmed)
          fail("Yayınlamadan önce kişisel bilgileri maskeleyip onaylayın.");
        if (data.fileId && !(await db.privateFile.findUnique({ where: { id: data.fileId } })))
          fail("Belge dosyası bulunamadı.");
        if (data.published && !data.fileId && !data.isPlaceholder)
          fail("Yayınlamak için belge yükleyin.");
        return json(
          id
            ? await db.certificate.update({ where: { id }, data })
            : await db.certificate.create({ data }),
        );
      }
      if (s[1] === "availability") {
        const data = z
          .object({
            dayOfWeek: z.number().int().min(0).max(6),
            startMinute: z.number().int().min(0).max(1439),
            endMinute: z.number().int().min(1).max(1440),
            active: z.boolean(),
            date: dateSchema.nullable().optional(),
          })
          .refine((d) => d.endMinute > d.startMinute, "Bitiş saati başlangıçtan sonra olmalı.")
          .parse(body);
        return json(
          id
            ? await db.availabilityRule.update({ where: { id }, data })
            : await db.availabilityRule.create({ data }),
        );
      }
      if (s[1] === "blocks") {
        const data = z
          .object({
            startsAt: z.iso.datetime({ offset: true }),
            endsAt: z.iso.datetime({ offset: true }),
            reason: z.string().max(200),
          })
          .refine(
            (d) => new Date(d.endsAt) > new Date(d.startsAt),
            "Bitiş başlangıçtan sonra olmalı.",
          )
          .parse(body);
        return json(
          await db.$transaction(async (tx) => {
            await bookingLock(tx);
            if (
              await tx.appointment.count({
                where: {
                  status: { in: activeStatuses },
                  startsAt: { lt: new Date(data.endsAt) },
                  reservedUntil: { gt: new Date(data.startsAt) },
                },
              })
            )
              fail("Bu aralıkta aktif randevu var. Önce randevuyu düzenleyin.", 409);
            return tx.blockedTime.create({ data });
          }),
        );
      }
      if (s[1] === "refunds") {
        requireDemo();
        const refund = await db.refund.findUnique({
          where: { id: z.string().parse(body.id) },
          include: { payment: true },
        });
        if (!refund || refund.status !== "PENDING" || refund.payment.provider !== "mock")
          fail("Geliştirme iadesi bulunamadı.");
        await db.$transaction([
          db.refund.update({
            where: { id: refund.id },
            data: { status: "REFUNDED", providerRefundId: randomUUID() },
          }),
          db.payment.update({ where: { id: refund.paymentId }, data: { status: "REFUNDED" } }),
        ]);
        return json({ ok: true });
      }
      if (s[1] === "data-requests") {
        const data = z
          .object({
            id: z.string(),
            status: z.enum(["REVIEWING", "RESOLVED", "REJECTED"]),
            resolution: z.string().min(5).max(3000),
          })
          .parse(body);
        await db.dataRequest.update({
          where: { id: data.id },
          data: {
            status: data.status,
            resolution: data.resolution,
            resolvedAt: data.status === "REVIEWING" ? null : new Date(),
          },
        });
        await db.auditLog.create({
          data: { actorId: user.id, action: "DATA_REQUEST_REVIEWED", resourceId: data.id },
        });
        return json({ ok: true });
      }
      if (s[1] === "support") {
        await db.supportRequest.update({
          where: { id: z.string().parse(body.id) },
          data: { status: z.enum(["OPEN", "CLOSED"]).parse(body.status) },
        });
        return json({ ok: true });
      }
      if (s[1] === "run-jobs") return json(await runJobs());
    }
    fail("İşlem bulunamadı.", 404);
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    assertOrigin(request);
    const user = await requireUser(true);
    const { segments: s } = await context.params;
    const { id } = z.object({ id: z.string() }).parse(await request.json());
    if (s[0] !== "admin") fail("İşlem bulunamadı.", 404);
    switch (s[1]) {
      case "services":
        await db.service.update({ where: { id }, data: { active: false } });
        break;
      case "faqs":
        await db.fAQ.delete({ where: { id } });
        break;
      case "blog":
        await db.blogPost.delete({ where: { id } });
        break;
      case "certificates":
        await db.certificate.delete({ where: { id } });
        break;
      case "education":
        await db.education.delete({ where: { id } });
        break;
      case "announcements":
        await db.announcement.delete({ where: { id } });
        break;
      case "site-content":
        await db.siteContent.delete({ where: { id } });
        break;
      case "availability":
        await db.availabilityRule.delete({ where: { id } });
        break;
      case "blocks":
        await db.blockedTime.delete({ where: { id } });
        break;
      default:
        fail("İşlem bulunamadı.", 404);
    }
    await db.auditLog.create({
      data: { actorId: user.id, action: `ADMIN_DELETE_${s[1]}`, resourceId: id },
    });
    return json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
