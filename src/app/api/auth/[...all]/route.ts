import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
const handlers = toNextJsHandler(auth);
export const GET = handlers.GET;
export async function POST(request: Request) {
  if (new URL(request.url).pathname.endsWith("/sign-up/email")) {
    const body = await request
      .clone()
      .json()
      .catch(() => null);
    if (body?.adultConfirmed !== true || body?.termsAccepted !== true)
      return Response.json(
        {
          message:
            "Yetişkinlik beyanı ve taslak kullanım/gizlilik metinlerini kabul etmeniz gerekli.",
        },
        { status: 422 },
      );
  }
  return handlers.POST(request);
}
