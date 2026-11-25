import { z } from "zod";
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Geçerli bir tarih seçin.")
  .refine((s) => !Number.isNaN(Date.parse(s)), "Tarih geçersiz.");
export const bookingSchema = z.object({
  serviceId: z.string().min(1),
  startsAt: z.iso.datetime({ offset: true }),
  consent: z.literal(true, { error: "Onam metnini kabul edin." }),
  privacy: z.literal(true, { error: "Aydınlatma metnini okuyun." }),
});
export const actionSchema = z.object({
  action: z.enum([
    "approve",
    "reject",
    "propose",
    "accept",
    "decline",
    "cancel",
    "complete",
    "no-show",
    "start",
  ]),
  startsAt: z.iso.datetime({ offset: true }).optional(),
});
export const feedbackSchema = z.object({
  overall: z.number().int().min(1).max(5),
  communication: z.number().int().min(1).max(5),
  booking: z.number().int().min(1).max(5),
  technical: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).default(""),
});
export const supportSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().max(254),
  subject: z.string().trim().min(3).max(150),
  message: z.string().trim().min(10).max(3000),
});
export const serviceSchema = z
  .object({
    name: z.string().trim().min(3).max(150),
    description: z.string().max(3000),
    durationMinutes: z.number().int().min(15).max(120),
    priceKurus: z.number().int().min(0).max(100000000),
    paymentRequired: z.boolean(),
    active: z.boolean(),
    order: z.number().int().min(0).default(0),
  })
  .refine((s) => !s.paymentRequired || s.priceKurus > 0, "Ücretli hizmet için fiyat girin.");
export const settingsSchema = z.object({
  reminderHours: z
    .preprocess(
      (value) => (typeof value === "string" ? value.split(",").map(Number) : value),
      z.array(z.number().int().min(1).max(168)).min(1).max(4),
    )
    .default([24, 1])
    .transform((values) => [...new Set(values)].sort((a, b) => b - a)),
  siteName: z.string().min(2).max(50),
  bookingNoticeHours: z.number().int().min(0).max(168),
  cancellationHours: z.number().int().min(0).max(168),
  bufferMinutes: z.number().int().min(0).max(60),
  holdHours: z.number().int().min(1).max(168),
  paymentHoldHours: z.number().int().min(1).max(72),
  cancellationText: z.string().max(3000),
});
const httpsOrEmpty = z.union([
  z.literal(""),
  z.url().refine((url) => url.startsWith("https://"), "Bağlantı HTTPS olmalı."),
]);
export const profileSchema = z
  .object({
    firstName: z.string().trim().min(1).max(50),
    lastName: z.string().trim().min(1).max(50),
    title: z.string().trim().max(150),
    biography: z.string().max(10000),
    experience: z.string().max(3000),
    approaches: z.string().max(3000),
    areas: z.string().max(3000),
    languages: z.string().max(300),
    contactEmail: z.union([z.email(), z.literal("")]),
    contactPhone: z.string().max(30),
    address: z.string().max(1000).default(""),
    instagramUrl: httpsOrEmpty.default(""),
    linkedinUrl: httpsOrEmpty.default(""),
    otherSocialUrl: httpsOrEmpty.default(""),
    isPlaceholder: z.boolean(),
  })
  .transform((data) => ({ ...data, name: `${data.firstName} ${data.lastName}` }));
export const websiteSchema = z.object({
  siteName: z.string().trim().min(2).max(50),
  browserTitle: z.string().trim().min(2).max(100),
  description: z.string().trim().min(2).max(500),
  homeHeadline: z.string().trim().min(2).max(200),
  homeDescription: z.string().trim().min(2).max(2000),
  showProfile: z.boolean(),
  showEducation: z.boolean(),
  showCertificates: z.boolean(),
  showBlog: z.boolean(),
});
