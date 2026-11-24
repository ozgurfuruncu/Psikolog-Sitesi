"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ShieldCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  LoaderCircle,
} from "lucide-react";
import { api, Button, useToast } from "./ui";
import { formatDate, formatTime, money, localDate, addDays } from "@/lib/i18n";
type Service = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceKurus: number;
  paymentRequired: boolean;
};
type Slot = { startsAt: string; endsAt: string };
export function BookingForm({
  services,
  initialService,
  signedIn,
  cancellationHours,
}: {
  services: Service[];
  initialService?: string;
  signedIn: boolean;
  cancellationHours: number;
}) {
  const [serviceId, setServiceId] = useState(initialService || services[0]?.id || ""),
    [step, setStep] = useState(0),
    [date, setDate] = useState(addDays(localDate(), 1)),
    [week, setWeek] = useState(addDays(localDate(), 1)),
    [slots, setSlots] = useState<Slot[]>([]),
    [slot, setSlot] = useState<Slot | null>(null),
    [loading, setLoading] = useState(false),
    [fetching, setFetching] = useState(false),
    [error, setError] = useState(""),
    [created, setCreated] = useState<string | null>(null),
    [consent, setConsent] = useState(false),
    [privacy, setPrivacy] = useState(false),
    toast = useToast();
  const service = services.find((s) => s.id === serviceId);
  useEffect(() => {
    if (step !== 1 || !serviceId) return;
    const controller = new AbortController();
    async function load() {
      setFetching(true);
      setError("");
      try {
        const response = await fetch(
          `/api/availability?serviceId=${encodeURIComponent(serviceId)}&date=${date}`,
          { signal: controller.signal },
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!controller.signal.aborted) setSlots(data);
      } catch (e) {
        if (!controller.signal.aborted) setError((e as Error).message);
      } finally {
        if (!controller.signal.aborted) setFetching(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [serviceId, date, step]);
  async function submit() {
    if (!slot) return;
    setLoading(true);
    setError("");
    try {
      const a = await api<{ id: string }>("/api/appointments", {
        serviceId,
        startsAt: slot.startsAt,
        consent,
        privacy,
      });
      setCreated(a.id);
      toast("Randevu talebiniz alındı.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="booking-layout">
      <div className="card">
        {created ? (
          <div className="booking-success">
            <div className="success-icon">
              <Check size={32} />
            </div>
            <p className="eyebrow" style={{ justifyContent: "center" }}>
              İLK ADIM TAMAM
            </p>
            <h2>Talebiniz bize ulaştı.</h2>
            <p>
              Uzman talebinizi değerlendirecek. Onay veya alternatif saat önerisini hesabınızdan
              takip edebilirsiniz. Randevunuz henüz kesinleşmedi.
            </p>
            <div className="button-row">
              <Link href={`/panel/randevular/${created}`} className="btn btn-primary">
                Randevu ayrıntıları
              </Link>
              <Link href="/panel" className="btn btn-outline">
                Hesabıma git
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="booking-steps">
              {["Görüşme türü", "Tarih ve saat", "Gözden geçirin"].map((label, i) => (
                <div className={`booking-step ${i <= step ? "active" : ""}`} key={label}>
                  <span>{i < step ? <Check size={12} /> : i + 1}</span>
                  {label}
                </div>
              ))}
            </div>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            {step === 0 && (
              <>
                <h3>Nasıl bir görüşme planlayalım?</h3>
                <p className="small">Görüşme türünü seçerek uygun saatleri görebilirsiniz.</p>
                {services.map((s) => (
                  <button
                    className={`booking-service ${s.id === serviceId ? "selected" : ""}`}
                    key={s.id}
                    onClick={() => {
                      setServiceId(s.id);
                      setSlot(null);
                    }}
                    aria-pressed={s.id === serviceId}
                  >
                    <div className="service-icon">
                      <CalendarDays size={21} />
                    </div>
                    <div>
                      <h3>{s.name}</h3>
                      <p>{s.durationMinutes} dakika · Online</p>
                    </div>
                    <div className="price">
                      {s.paymentRequired ? money(s.priceKurus) : "Online ödeme yok"}
                      <small>{s.paymentRequired ? "Test ücreti" : "Geliştirme örneği"}</small>
                    </div>
                  </button>
                ))}
                <div className="notice">
                  <Info size={16} />
                  <p>
                    Örnek hizmet ve ücretlerdir. Gerçek hizmet kapsamı mesleki ve hukuki inceleme
                    sonrası belirlenecektir.
                  </p>
                </div>
              </>
            )}
            {step === 1 && (
              <>
                <h3>Size uygun bir zaman seçin.</h3>
                <p className="small">
                  Tüm saatler Türkiye saatine göre gösterilir (İstanbul, UTC+3).
                </p>
                <div className="card-header" style={{ marginBottom: 0 }}>
                  <span className="small">
                    {formatDate(date, { month: "long", year: "numeric" })}
                  </span>
                  <div className="button-row">
                    <button
                      className="icon-btn"
                      disabled={week <= localDate()}
                      onClick={() => {
                        const next =
                          addDays(week, -7) < localDate() ? localDate() : addDays(week, -7);
                        setWeek(next);
                        setDate(next);
                        setSlot(null);
                      }}
                      aria-label="Önceki hafta"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      className="icon-btn"
                      disabled={week >= addDays(localDate(), 83)}
                      onClick={() => {
                        const next = addDays(week, 7);
                        setWeek(next);
                        setDate(next);
                        setSlot(null);
                      }}
                      aria-label="Sonraki hafta"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
                <div className="date-grid">
                  {Array.from({ length: 7 }, (_, i) => addDays(week, i)).map((d) => (
                    <button
                      key={d}
                      className={`date-button ${date === d ? "selected" : ""}`}
                      onClick={() => {
                        setDate(d);
                        setSlot(null);
                      }}
                      aria-pressed={date === d}
                    >
                      <span>
                        {formatDate(new Date(d + "T12:00:00+03:00"), { weekday: "short" })}
                      </span>
                      <strong>{Number(d.slice(-2))}</strong>
                    </button>
                  ))}
                </div>
                <div className="field">
                  <label htmlFor="booking-date">Başka bir tarih seçin</label>
                  <input
                    id="booking-date"
                    type="date"
                    value={date}
                    min={localDate()}
                    max={addDays(localDate(), 90)}
                    onChange={(e) => {
                      if (e.target.value) {
                        setDate(e.target.value);
                        setWeek(e.target.value);
                        setSlot(null);
                      }
                    }}
                  />
                </div>
                {fetching ? (
                  <p className="small" role="status">
                    <LoaderCircle
                      className="spin"
                      size={17}
                      style={{ display: "inline", verticalAlign: "middle", marginRight: 8 }}
                    />
                    Uygun saatler yükleniyor…
                  </p>
                ) : slots.length ? (
                  <div className="time-grid">
                    {slots.map((s) => (
                      <button
                        key={s.startsAt}
                        className={`time-button ${slot?.startsAt === s.startsAt ? "selected" : ""}`}
                        onClick={() => setSlot(s)}
                        aria-pressed={slot?.startsAt === s.startsAt}
                      >
                        {formatTime(s.startsAt)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <h3>Bu tarihte uygun saat bulunmuyor.</h3>
                    <p>Başka bir tarih seçebilir veya bekleme listesine katılabilirsiniz.</p>
                    {signedIn ? (
                      <Button
                        variant="outline"
                        onClick={async () => {
                          try {
                            await api("/api/waitlist", { date });
                            toast("Uygun saat açılırsa bildirim alacaksınız.");
                          } catch (e) {
                            toast((e as Error).message, true);
                          }
                        }}
                      >
                        Bekleme listesine katıl
                      </Button>
                    ) : (
                      <Link href="/giris" className="text-link">
                        Bekleme listesi için giriş yapın
                      </Link>
                    )}
                  </div>
                )}
              </>
            )}
            {step === 2 && (
              <>
                <h3>Son bir kez gözden geçirelim.</h3>
                <p className="small">
                  Talebiniz uzman onayına iletilecek. Gerekirse alternatif saat önerilecektir.
                </p>
                <div className="booking-summary-row">
                  <span>Görüşme</span>
                  <strong>{service?.name}</strong>
                </div>
                <div className="booking-summary-row">
                  <span>Tarih</span>
                  <strong>
                    {slot &&
                      formatDate(slot.startsAt, { day: "numeric", month: "long", weekday: "long" })}
                  </strong>
                </div>
                <div className="booking-summary-row">
                  <span>Saat</span>
                  <strong>
                    {slot && `${formatTime(slot.startsAt)} – ${formatTime(slot.endsAt)}`}
                  </strong>
                </div>
                <div className="booking-summary-row">
                  <span>{service?.paymentRequired ? "Test ücreti" : "Ödeme"}</span>
                  <strong>
                    {service?.paymentRequired
                      ? money(service.priceKurus)
                      : "Online ödeme gerekmiyor"}
                  </strong>
                </div>
                <div className="notice">
                  <Info size={16} />
                  <p>
                    İptal ve saat değişikliği için randevudan en az {cancellationHours} saat önce
                    işlem yapın. Ücretli görüşmelerde ödeme uzman onayından sonra istenir.
                    Geliştirme ortamında gerçek ücret tahsil edilmez.
                  </p>
                </div>
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={privacy}
                    onChange={(e) => setPrivacy(e.target.checked)}
                  />
                  <span>
                    <Link href="/kvkk" target="_blank" className="text-link">
                      KVKK aydınlatma metnini
                    </Link>{" "}
                    ve{" "}
                    <Link href="/iptal-iade" target="_blank" className="text-link">
                      iptal/iade koşullarını
                    </Link>{" "}
                    okudum.
                  </span>
                </label>
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  <span>
                    <Link href="/onam" target="_blank" className="text-link">
                      Bilgilendirilmiş onam metnini
                    </Link>{" "}
                    okudum, kabul ediyorum. Bu ortamın geliştirme amaçlı olduğunu biliyorum.
                  </span>
                </label>
                {!signedIn && (
                  <div className="notice notice-green">
                    <ShieldCheck size={17} />
                    <p>
                      Talebinizi göndermek için{" "}
                      <Link href="/giris" className="text-link">
                        giriş yapın
                      </Link>{" "}
                      veya{" "}
                      <Link href="/kayit" className="text-link">
                        hesap oluşturun
                      </Link>
                      .
                    </p>
                  </div>
                )}
              </>
            )}
            <div className="booking-actions">
              <Button
                variant="ghost"
                disabled={step === 0}
                onClick={() => {
                  setStep(step - 1);
                  setError("");
                }}
              >
                Geri
              </Button>
              {step < 2 ? (
                <Button
                  onClick={() => {
                    setStep(step + 1);
                    setError("");
                  }}
                  disabled={!service || (step === 1 && (!slot || fetching))}
                >
                  Devam et
                </Button>
              ) : (
                <Button
                  loading={loading}
                  disabled={!signedIn || !consent || !privacy}
                  onClick={submit}
                >
                  Randevu talebini gönder
                </Button>
              )}
            </div>
          </>
        )}
      </div>
      <aside className="booking-aside">
        <div className="card">
          <p className="eyebrow">SİZE AYRILAN ZAMAN</p>
          <h3>Randevu özetiniz</h3>
          <div className="booking-summary-row">
            <span>Görüşme türü</span>
            <span>{service?.name || "Seçilmedi"}</span>
          </div>
          <div className="booking-summary-row">
            <span>Süre</span>
            <span>{service?.durationMinutes || "–"} dakika</span>
          </div>
          <div className="booking-summary-row">
            <span>Tarih</span>
            <span>
              {slot
                ? formatDate(slot.startsAt, { day: "numeric", month: "long" })
                : "Henüz seçilmedi"}
            </span>
          </div>
          <div className="booking-summary-row">
            <span>Saat</span>
            <span>{slot ? formatTime(slot.startsAt) : "Henüz seçilmedi"}</span>
          </div>
          <div className="booking-summary-row">
            <span>{service?.paymentRequired ? "Test ücreti" : "Ödeme"}</span>
            <strong>
              {service?.paymentRequired ? money(service.priceKurus) : "Online ödeme yok"}
            </strong>
          </div>
          <div className="notice notice-green">
            <ShieldCheck size={17} />
            <p>
              Bilgilerinizi yalnızca siz ve yetkili uzman görebilirsiniz. Diğer danışanların
              bilgileri paylaşılmaz.
            </p>
          </div>
        </div>
        <p className="small muted" style={{ padding: "15px 5px", fontSize: ".75rem" }}>
          Yalnızca 18 yaş ve üzeri kişiler içindir. Acil durumlarda 112’yi arayın.
        </p>
      </aside>
    </div>
  );
}
