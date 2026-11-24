import { randomUUID, createHmac } from "node:crypto";
import { db } from "../db";
import { assertSessionWindow, getOwnedAppointment, type Actor } from "../appointments";
import { fail } from "../errors";
import { isDemo } from "../env";
import { signaturesEqual } from "./payment";
export interface VideoProvider {
  name: string;
  issueAccess(
    actor: Actor,
    appointmentId: string,
  ): Promise<{ roomId: string; token: string; expiresAt: number; developmentOnly: boolean }>;
}
export const mockVideoProvider: VideoProvider = {
  name: "mock",
  async issueAccess(actor, appointmentId) {
    if (!isDemo() || process.env.VIDEO_PROVIDER !== "mock")
      fail("Görüşme sağlayıcısı henüz etkin değil.", 503);
    const a = await getOwnedAppointment(actor, appointmentId);
    if (!["CONFIRMED", "IN_PROGRESS"].includes(a.status))
      fail("Bu randevu için görüşme odası açılamaz.", 403);
    assertSessionWindow(a.startsAt, a.endsAt);
    const video = await db.videoSession.upsert({
      where: { appointmentId },
      create: { appointmentId, roomId: randomUUID(), provider: "mock" },
      update: {},
    });
    if (video.endedAt) fail("Görüşme sona erdi.", 403);
    const expiresAt = Math.floor(
      Math.min(Date.now() + 5 * 60_000, a.endsAt.getTime() + 15 * 60_000) / 1000,
    );
    const payload = Buffer.from(
      JSON.stringify({ userId: actor.id, appointmentId, roomId: video.roomId, expiresAt }),
    ).toString("base64url");
    const signature = createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
      .update(payload)
      .digest("hex");
    return {
      roomId: video.roomId,
      token: `${payload}.${signature}`,
      expiresAt,
      developmentOnly: true,
    };
  },
};
export async function verifyVideoAccess(actor: Actor, token: string) {
  if (!isDemo()) fail("Geliştirme odası kapalı.", 503);
  const [payload, signature] = token.split(".");
  if (
    !payload ||
    !signaturesEqual(
      signature,
      createHmac("sha256", process.env.BETTER_AUTH_SECRET!).update(payload).digest("hex"),
    )
  )
    fail("Geçersiz oda yetkisi.", 403);
  let data: { userId: string; appointmentId: string; roomId: string; expiresAt: number };
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    fail("Geçersiz oda yetkisi.", 403);
  }
  if (data.userId !== actor.id || data.expiresAt < Math.floor(Date.now() / 1000))
    fail("Oda yetkisinin süresi dolmuş.", 403);
  const a = await getOwnedAppointment(actor, data.appointmentId);
  if (
    a.video?.roomId !== data.roomId ||
    a.video.endedAt ||
    !["CONFIRMED", "IN_PROGRESS"].includes(a.status)
  )
    fail("Odaya erişilemiyor.", 403);
  assertSessionWindow(a.startsAt, a.endsAt);
  return data;
}
