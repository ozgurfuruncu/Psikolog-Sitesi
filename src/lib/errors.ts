import { ZodError } from "zod";
import { reportServerError } from "./monitoring";
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function fail(message: string, status = 400): never {
  throw new AppError(message, status);
}
export async function apiError(error: unknown) {
  if (error instanceof SyntaxError)
    return Response.json({ error: "İstek içeriği geçerli değil." }, { status: 400 });
  if (error instanceof AppError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError)
    return Response.json(
      { error: error.issues[0]?.message || "Bilgileri kontrol edin." },
      { status: 422 },
    );
  const code = (error as { code?: string })?.code;
  if (code === "P2002" || code === "P2034" || code === "P2004" || code === "P2010")
    return Response.json(
      {
        error: "Bu işlem başka bir kayıtla çakıştı. Güncel bilgileri kontrol edip tekrar deneyin.",
      },
      { status: 409 },
    );
  const reference = await reportServerError(error, "api");
  return Response.json(
    { error: "İşlem tamamlanamadı. Lütfen daha sonra tekrar deneyin.", reference },
    { status: 500 },
  );
}
