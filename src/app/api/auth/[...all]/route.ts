import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { apiError } from "@/lib/errors";
import { isIsolatedTest, isReview } from "@/lib/env";
const handlers = toNextJsHandler(auth);
export async function GET(request: Request) {
  try {
    return await handlers.GET(request);
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length") || 0) > 32768)
      return Response.json({ message: "İstek çok büyük." }, { status: 413 });
    if (new URL(request.url).pathname.endsWith("/sign-up/email")) {
      if (
        process.env.NODE_ENV === "production" &&
        !isIsolatedTest() &&
        !isReview() &&
        process.env.PRODUCTION_LEGAL_APPROVED !== "true"
      )
        return Response.json({ message: "Hesap kaydı henüz hizmete açılmadı." }, { status: 503 });
      const body = await request
        .clone()
        .json()
        .catch(() => null);
      if (
        isReview() &&
        (typeof body?.email !== "string" || !/^[^@\s]+@example\.test$/i.test(body.email))
      )
        return Response.json(
          { message: "Demo için @example.test uzantılı kurgusal bir e-posta adresi kullanın." },
          { status: 422 },
        );
      if (body?.adultConfirmed !== true || body?.termsAccepted !== true)
        return Response.json(
          {
            message:
              "Yetişkinlik beyanı ve taslak kullanım/gizlilik metinlerini kabul etmeniz gerekli.",
          },
          { status: 422 },
        );
    }
    return await handlers.POST(request);
  } catch (error) {
    return apiError(error);
  }
}
