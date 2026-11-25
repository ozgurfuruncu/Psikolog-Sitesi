import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { db } from "./db";
import { queueEmail } from "./mail";
import { appUrl, developmentOrigins, trustedAppOrigins } from "./env";

if (!process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length < 32)
  throw new Error("BETTER_AUTH_SECRET must contain at least 32 random characters.");

export const auth = betterAuth({
  logger: { disabled: true },
  appName: "Site Adı",
  baseURL: developmentOrigins.length
    ? {
        allowedHosts: trustedAppOrigins.map((origin) => new URL(origin).host),
        fallback: appUrl,
        protocol: "http",
      }
    : process.env.BETTER_AUTH_URL || appUrl,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: trustedAppOrigins,
  database: prismaAdapter(db, { provider: "postgresql", transaction: true }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await queueEmail(
        user.email,
        "Hesabınıza ilişkin bir işlem",
        `Şifrenizi yenilemek için bu tek kullanımlık bağlantıyı açın: ${url}`,
      );
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: false,
    expiresIn: 3600,
    sendVerificationEmail: async ({ user, url }) => {
      await queueEmail(
        user.email,
        "E-posta adresinizi doğrulayın",
        `Hesabınızı doğrulamak için bağlantıyı açın: ${url}`,
      );
    },
  },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "CLIENT", input: false },
      adultConfirmed: { type: "boolean", defaultValue: false, required: true, input: true },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!(user as unknown as { adultConfirmed: boolean }).adultConfirmed)
            throw new APIError("BAD_REQUEST", {
              message: "Yalnızca 18 yaş ve üzerindeki kişiler hesap oluşturabilir.",
            });
          return { data: { ...user, role: "CLIENT" } };
        },
        after: async (user) => {
          await db.clientProfile.create({ data: { userId: user.id } });
          await db.notificationPreference.create({ data: { userId: user.id } });
          await db.consentRecord.createMany({
            data: ["PRIVACY", "TERMS", "ADULT"].map((documentType) => ({
              userId: user.id,
              documentType,
              documentVersion: "draft-1",
            })),
          });
          await db.notification.create({
            data: {
              userId: user.id,
              kind: "WELCOME",
              title: "Hesabınız oluşturuldu",
              body: "E-posta adresinizi doğrulayarak giriş yapabilirsiniz.",
              dedupeKey: `welcome:${user.id}`,
            },
          });
        },
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: false },
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 30,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
      "/request-password-reset": { window: 60, max: 3 },
    },
  },
  advanced: { useSecureCookies: process.env.NODE_ENV === "production" },
});
