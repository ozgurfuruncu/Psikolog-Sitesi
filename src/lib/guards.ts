import { headers } from "next/headers";
import { auth } from "./auth";
import { fail } from "./errors";
import { db } from "./db";
import { redirect } from "next/navigation";
import { trustedAppOrigins } from "./env";

export async function currentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      adultConfirmed: true,
    },
  });
}
export async function requireUser(admin = false) {
  const user = await currentUser();
  if (!user) fail("Bu işlem için giriş yapın.", 401);
  if (!user.emailVerified) fail("Önce e-posta adresinizi doğrulayın.", 403);
  if (admin && user.role !== "ADMIN") fail("Bu işlem için yetkiniz yok.", 403);
  return user;
}
export async function pageUser(admin = false) {
  const user = await currentUser();
  if (!user) redirect("/giris");
  if (admin && user.role !== "ADMIN") redirect("/panel");
  return user;
}
export function assertOrigin(request: Request) {
  if (!trustedAppOrigins.includes(request.headers.get("origin") || ""))
    fail("İstek kaynağı doğrulanamadı.", 403);
  if (
    !request.headers.get("content-type")?.includes("application/json") &&
    !request.headers.get("content-type")?.includes("multipart/form-data")
  )
    fail("Geçersiz içerik türü.", 415);
}
export async function rateLimit(key: string, max = 20, windowMs = 60_000) {
  const now = BigInt(Date.now());
  const result = await db.$queryRaw<Array<{ count: number }>>`
    INSERT INTO "RateLimit" (id,key,count,"lastRequest") VALUES (${key},${key},1,${now})
    ON CONFLICT (key) DO UPDATE SET count = CASE WHEN "RateLimit"."lastRequest" < ${now - BigInt(windowMs)} THEN 1 ELSE "RateLimit".count+1 END,
    "lastRequest" = CASE WHEN "RateLimit"."lastRequest" < ${now - BigInt(windowMs)} THEN ${now} ELSE "RateLimit"."lastRequest" END RETURNING count`;
  if (result[0].count > max) fail("Çok fazla deneme yaptınız. Biraz sonra tekrar deneyin.", 429);
}
