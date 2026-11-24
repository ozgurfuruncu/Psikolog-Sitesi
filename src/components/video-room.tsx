"use client";
import { useEffect, useRef, useState } from "react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  ShieldCheck,
  MonitorCheck,
  Info,
} from "lucide-react";
import Link from "next/link";
import { Button, api, useToast } from "./ui";
import { formatDate, formatTime } from "@/lib/i18n";
type Access = { roomId: string; token: string; expiresAt: number; developmentOnly: boolean };
export function VideoRoom({
  appointment,
  admin = false,
  demo = false,
}: {
  appointment: {
    id: string;
    startsAt: string;
    endsAt: string;
    status: string;
    service: { name: string };
  };
  admin?: boolean;
  demo?: boolean;
}) {
  const [stream, setStream] = useState<MediaStream | null>(null),
    [camera, setCamera] = useState(true),
    [mic, setMic] = useState(true),
    [access, setAccess] = useState<Access | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [now, setNow] = useState(() => new Date().getTime()),
    [connection, setConnection] = useState("online"),
    video = useRef<HTMLVideoElement>(null),
    mediaRef = useRef<MediaStream | null>(null),
    toast = useToast();
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    const online = () => setConnection("online"),
      offline = () => setConnection("offline");
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      clearInterval(t);
      mediaRef.current?.getTracks().forEach((t) => t.stop());
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);
  useEffect(() => {
    if (video.current) video.current.srcObject = stream;
  }, [stream]);
  useEffect(() => {
    if (!access) return;
    let active = true;
    const check = async () => {
      try {
        await api(`/api/appointments/${appointment.id}/video-check`, { token: access.token });
        if (active && access.expiresAt * 1000 - Date.now() < 90_000) {
          const next = await api<Access>(`/api/appointments/${appointment.id}/video`, {});
          if (active) setAccess(next);
        }
      } catch (e) {
        if (active) {
          setAccess(null);
          setError((e as Error).message);
        }
      }
    };
    const t = setInterval(check, 30_000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [access, appointment.id]);
  const remaining = Math.max(
    0,
    Math.floor((new Date(appointment.startsAt).getTime() - now) / 1000),
  );
  const windowOpen =
    now >= new Date(appointment.startsAt).getTime() - 10 * 60_000 &&
    now <= new Date(appointment.endsAt).getTime() + 15 * 60_000;
  async function testDevices() {
    setBusy(true);
    setError("");
    try {
      mediaRef.current?.getTracks().forEach((t) => t.stop());
      const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      mediaRef.current = media;
      setStream(media);
      setCamera(true);
      setMic(true);
      toast(
        "Kamera ve mikrofon izinleri alındı. Mikrofon sesini tarayıcı ayarlarından kontrol edebilirsiniz.",
      );
    } catch {
      setError(
        "Kamera veya mikrofon açılamadı. Cihaz bağlantısını ve tarayıcı izinlerini kontrol edin.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="notice">
        <Info size={18} />
        <p>
          {demo
            ? "Geliştirme odasıdır. Kamera görüntüsü yalnızca kendi cihazınızda gösterilir; başka katılımcıya görüntü veya ses iletilmez. Görüşme kaydedilmez."
            : "Canlı görüşme hizmeti yapılandırılana ve gerekli hukuki incelemeler tamamlanana kadar kapalıdır."}
        </p>
      </div>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      <div className="video-layout">
        <div>
          <div className="video-stage">
            {stream ? (
              <video
                ref={video}
                autoPlay
                playsInline
                muted
                aria-label="Yerel kamera önizlemesi"
                style={{ visibility: camera ? "visible" : "hidden" }}
              />
            ) : (
              <div className="video-placeholder">
                <Video size={48} strokeWidth={1} />
                <strong>
                  {access
                    ? "Geliştirme odasına giriş yapıldı"
                    : "Kendi alanınızdan, hazır olduğunuzda."}
                </strong>
                <p>
                  {access
                    ? "Bu bir oda erişim simülasyonudur. Karşı katılımcı bağlantısı yoktur."
                    : "Kamera ve mikrofonunuzu görüşme öncesinde kontrol edebilirsiniz."}
                </p>
              </div>
            )}
            <span className="video-badge">
              {access ? "Yetkili geliştirme erişimi" : "Cihaz önizlemesi"} · Kayıt kapalı
            </span>
            {stream && !camera && (
              <div className="video-placeholder" style={{ position: "absolute" }}>
                <VideoOff size={40} />
                <p>Kameranız kapalı</p>
              </div>
            )}
          </div>
          <div className="video-controls">
            <button
              aria-label={mic ? "Mikrofonu kapat" : "Mikrofonu aç"}
              className={!mic ? "off" : ""}
              disabled={!stream}
              onClick={() => {
                stream?.getAudioTracks().forEach((t) => (t.enabled = !mic));
                setMic(!mic);
              }}
            >
              {mic ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
            <button
              aria-label={camera ? "Kamerayı kapat" : "Kamerayı aç"}
              className={!camera ? "off" : ""}
              disabled={!stream}
              onClick={() => {
                stream?.getVideoTracks().forEach((t) => (t.enabled = !camera));
                setCamera(!camera);
              }}
            >
              {camera ? <Video size={20} /> : <VideoOff size={20} />}
            </button>
            <button
              aria-label="Odayı terk et ve cihazları kapat"
              className="off"
              onClick={() => {
                mediaRef.current?.getTracks().forEach((t) => t.stop());
                mediaRef.current = null;
                setStream(null);
                setAccess(null);
                toast("Odadan ayrıldınız. Cihazlar kapatıldı.");
              }}
            >
              <PhoneOff size={20} />
            </button>
          </div>
        </div>
        <aside className="card">
          <p className="eyebrow">RANDEVUNUZ</p>
          <h3>{appointment.service.name}</h3>
          <p className="small">
            {formatDate(appointment.startsAt)}
            <br />
            {formatTime(appointment.startsAt)} – {formatTime(appointment.endsAt)}
          </p>
          {remaining > 0 && (
            <>
              <span className="small muted">Görüşmeye kalan süre</span>
              <div className="video-timer">
                {Math.floor(remaining / 3600)
                  .toString()
                  .padStart(2, "0")}
                :
                {Math.floor((remaining % 3600) / 60)
                  .toString()
                  .padStart(2, "0")}
                :{(remaining % 60).toString().padStart(2, "0")}
              </div>
            </>
          )}
          <p className="small muted">
            Oda 10 dakika önce açılır.
            <br />
            Bağlantı: {connection === "online" ? "İnternet erişimi var" : "Bağlantı kesildi"}
          </p>
          <div className="action-stack">
            <Button variant="outline" loading={busy} onClick={testDevices}>
              <MonitorCheck size={16} />
              Cihazlarımı test et
            </Button>
            <Button
              disabled={!demo || !windowOpen || connection === "offline" || !!access}
              loading={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  const data = await api<Access>(`/api/appointments/${appointment.id}/video`, {});
                  setAccess(data);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <ShieldCheck size={16} />
              {access ? "Geliştirme odasındasınız" : "Geliştirme odasına katıl"}
            </Button>
            <Link
              className="btn btn-ghost"
              href={`${admin ? "/yonetim" : "/panel"}/randevular/${appointment.id}`}
            >
              Randevu ayrıntıları
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
