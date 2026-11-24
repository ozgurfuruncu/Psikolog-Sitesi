import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  Clock3,
  CheckCheck,
  Wallet,
  Plus,
  Video,
  MessageSquare,
  LifeBuoy,
  ShieldCheck,
  Info,
} from "lucide-react";
import { db } from "@/lib/db";
import { pageUser } from "@/lib/guards";
import { getOwnedAppointment } from "@/lib/appointments";
import { serialize } from "@/lib/serialize";
import { AppointmentList } from "@/components/appointment-list";
import { AppointmentActions } from "@/components/appointment-actions";
import { AccountSettings } from "@/components/account-settings";
import { Notifications } from "@/components/notifications";
import { PaymentList } from "@/components/payment-list";
import { FeedbackForm } from "@/components/feedback-form";
import { VideoRoom } from "@/components/video-room";
import { Badge, EmptyState } from "@/components/ui";
import { formatDate, formatTime, money, statusLabels } from "@/lib/i18n";
import { isDemo } from "@/lib/env";
export const dynamic = "force-dynamic";
export const metadata = { title: "Danışan paneli" };
export default async function Panel({
  params,
  searchParams,
}: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<{ appointment?: string }>;
}) {
  const { section = [] } = await params,
    [tab, id] = section,
    user = await pageUser();
  if (tab === "randevular" && id) {
    let a;
    try {
      a = await getOwnedAppointment(user, id);
    } catch {
      notFound();
    }
    return (
      <>
        <div className="breadcrumbs">
          <Link href="/panel/randevular">Randevularım</Link>
          <span>/</span>
          <span>Randevu ayrıntıları</span>
        </div>
        <div className="app-page-title">
          <div>
            <h1>{a.service.name}</h1>
            <p>Randevunuzun durumunu ve sonraki adımları takip edin.</p>
          </div>
          <Badge status={a.status}>{statusLabels[a.status]}</Badge>
        </div>
        <div className="detail-layout">
          <div>
            <section className="card">
              <div className="detail-info">
                <div>
                  <label>Tarih</label>
                  <strong>
                    {formatDate(a.startsAt, { day: "numeric", month: "long", year: "numeric" })}
                  </strong>
                </div>
                <div>
                  <label>Saat (İstanbul)</label>
                  <strong>
                    {formatTime(a.startsAt)} – {formatTime(a.endsAt)}
                  </strong>
                </div>
                <div>
                  <label>Görüşme süresi</label>
                  <strong>{a.durationMinutes} dakika</strong>
                </div>
                <div>
                  <label>Ödeme</label>
                  <strong>
                    {a.payment?.status === "NOT_REQUIRED" ? "Gerekmiyor" : money(a.priceKurus)}
                  </strong>
                </div>
                <div>
                  <label>İptal / değişiklik süresi</label>
                  <strong>En az {a.cancellationHours} saat önce</strong>
                </div>
                <div>
                  <label>Ödeme durumu</label>
                  <strong>{statusLabels[a.payment?.status || "PENDING"]}</strong>
                </div>
              </div>
              {a.holdExpiresAt && (
                <div className="notice">
                  <Clock3 size={17} />
                  <p>
                    Bu saat{" "}
                    {formatDate(a.holdExpiresAt, {
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    tarihine kadar geçici ayrılmıştır. Süresi dolan talepler serbest bırakılır.
                  </p>
                </div>
              )}
              {a.status === "ALTERNATIVE_PROPOSED" && (
                <div className="notice notice-green">
                  <Info size={17} />
                  <p>
                    Uzmanınız yukarıdaki yeni saati önerdi. Kabul ederek devam edebilir veya öneriyi
                    reddedebilirsiniz.
                  </p>
                </div>
              )}
            </section>
            <section className="card" style={{ marginTop: 24 }}>
              <h3>Randevu geçmişi</h3>
              <ul className="history-list">
                {a.history.map((h) => (
                  <li key={h.id}>
                    {statusLabels[h.toStatus]}
                    <time>
                      {formatDate(h.createdAt, {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <aside className="card">
            <h3>Sonraki adımlar</h3>
            <AppointmentActions appointment={serialize(a)} />
            <p className="small muted" style={{ marginTop: 24 }}>
              Randevu veya bağlantı konusunda desteğe ihtiyacınız varsa{" "}
              <Link href="/iletisim" className="text-link">
                iletişime geçebilirsiniz.
              </Link>
            </p>
          </aside>
        </div>
      </>
    );
  }
  if (tab === "randevular") {
    const rows = await db.appointment.findMany({
      where: { clientId: user.id },
      include: { service: true, payment: true },
      orderBy: { startsAt: "desc" },
      take: 200,
    });
    return (
      <>
        <PageTitle
          title="Randevularım"
          description="Planladığınız, bekleyen ve geçmiş görüşmeleriniz."
          booking
        />
        <div className="card">
          <AppointmentList appointments={serialize(rows)} />
        </div>
      </>
    );
  }
  if (tab === "ayarlar") {
    const profile = await db.user.findUniqueOrThrow({
      where: { id: user.id },
      include: {
        profile: true,
        preferences: true,
        dataRequests: { orderBy: { createdAt: "desc" } },
      },
    });
    return (
      <>
        <PageTitle
          title="Hesap ayarlarım"
          description="Kişisel bilgileriniz, bildirimleriniz ve gizlilik tercihleriniz."
        />
        <AccountSettings profile={serialize(profile)} />
      </>
    );
  }
  if (tab === "bildirimler") {
    const items = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return (
      <>
        <PageTitle
          title="Bildirimler"
          description="Randevu ve hesabınızla ilgili tüm gelişmeler."
        />
        <div className="card">
          <Notifications items={serialize(items)} />
        </div>
      </>
    );
  }
  if (tab === "odemeler") {
    const payments = await db.payment.findMany({
      where: { appointment: { clientId: user.id } },
      include: { appointment: { include: { service: true } }, refunds: true },
      orderBy: { createdAt: "desc" },
    });
    return (
      <>
        <PageTitle
          title="Ödemelerim"
          description="Ödeme işlemlerinizi ve iade durumlarını takip edin."
        />
        <PaymentList payments={serialize(payments)} demo={isDemo()} />
      </>
    );
  }
  if (tab === "degerlendirmeler") {
    const { appointment } = await searchParams;
    const appointments = await db.appointment.findMany({
      where: { clientId: user.id, status: "COMPLETED" },
      include: { service: true, feedback: true },
      orderBy: { startsAt: "desc" },
    });
    const selected = appointments.find((a) => a.id === appointment && !a.feedback);
    return (
      <>
        <PageTitle
          title="Değerlendirmelerim"
          description="Deneyiminizi yalnızca uzmanınızla, isteğe bağlı paylaşın."
        />
        {selected ? (
          <div className="card" style={{ maxWidth: 700 }}>
            <h3>
              {selected.service.name} · {formatDate(selected.startsAt)}
            </h3>
            <FeedbackForm appointmentId={selected.id} />
          </div>
        ) : appointments.length ? (
          <div className="grid-2">
            {appointments.map((a) => (
              <article className="card" key={a.id}>
                <div className="card-header">
                  <h3>{a.service.name}</h3>
                  <ShieldCheck size={18} color="var(--primary)" />
                </div>
                <p className="small">{formatDate(a.startsAt)}</p>
                {a.feedback ? (
                  <>
                    <Badge>Yalnızca siz ve uzmanınız görebilir</Badge>
                    <p style={{ marginTop: 18 }}>
                      Genel deneyim: <strong>{a.feedback.overall} / 5</strong>
                    </p>
                    <p className="small">
                      İletişim: {a.feedback.communication}/5 · Süreç: {a.feedback.booking}/5 ·
                      Teknik: {a.feedback.technical}/5
                    </p>
                    {a.feedback.comment && <p className="feedback-comment">{a.feedback.comment}</p>}
                  </>
                ) : (
                  <>
                    <p className="small">
                      Paylaşmak isterseniz kısa ve özel değerlendirmenizi iletebilirsiniz.
                    </p>
                    <Link
                      className="btn btn-outline"
                      href={`/panel/degerlendirmeler?appointment=${a.id}`}
                    >
                      Değerlendirme yap
                    </Link>
                  </>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="card">
            <EmptyState
              icon={<MessageSquare />}
              title="Henüz değerlendirme bekleyen görüşme yok"
              description="Uzmanınız görüşmeyi tamamladığında isteğe bağlı form burada açılacak."
            />
          </div>
        )}
      </>
    );
  }
  if (tab === "gorusme") {
    if (id) {
      let a;
      try {
        a = await getOwnedAppointment(user, id);
      } catch {
        notFound();
      }
      return (
        <>
          <PageTitle
            title="Online görüşme"
            description="Cihazınızı kontrol edin, görüşmeniz için hazırlanın."
          />
          <VideoRoom appointment={serialize(a)} demo={isDemo()} />
        </>
      );
    }
    const appointments = await db.appointment.findMany({
      where: {
        clientId: user.id,
        status: { in: ["CONFIRMED", "IN_PROGRESS"] },
        endsAt: { gte: new Date(new Date().getTime() - 15 * 60_000) },
      },
      include: { service: true },
      orderBy: { startsAt: "asc" },
    });
    return (
      <>
        <PageTitle title="Online görüşme" description="Onaylı randevunuzun görüşme alanını açın." />
        {appointments.length ? (
          <div className="grid-2">
            {appointments.map((a) => (
              <div className="card" key={a.id}>
                <div className="service-icon">
                  <Video size={23} />
                </div>
                <h3>{a.service.name}</h3>
                <p>
                  {formatDate(a.startsAt)} · {formatTime(a.startsAt)}
                </p>
                <Link href={`/panel/gorusme/${a.id}`} className="btn btn-primary">
                  Görüşme alanını aç
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="card">
            <EmptyState
              icon={<Video />}
              title="Yaklaşan onaylı görüşmeniz yok"
              description="Randevunuz kesinleştiğinde görüşme alanı burada görüntülenecek."
            />
          </div>
        )}
      </>
    );
  }
  if (tab) notFound();
  const now = new Date();
  const [upcoming, pending, completed, payments, next, rows, notifications] = await Promise.all([
    db.appointment.count({
      where: {
        clientId: user.id,
        status: { in: ["CONFIRMED", "IN_PROGRESS"] },
        endsAt: { gte: now },
      },
    }),
    db.appointment.count({
      where: {
        clientId: user.id,
        status: { in: ["PENDING_APPROVAL", "ALTERNATIVE_PROPOSED", "AWAITING_PAYMENT"] },
      },
    }),
    db.appointment.count({ where: { clientId: user.id, status: "COMPLETED" } }),
    db.payment.count({
      where: {
        status: { in: ["PENDING", "FAILED"] },
        appointment: { clientId: user.id, status: "AWAITING_PAYMENT" },
      },
    }),
    db.appointment.findFirst({
      where: {
        clientId: user.id,
        status: { in: ["CONFIRMED", "IN_PROGRESS"] },
        endsAt: { gte: now },
      },
      include: { service: true },
      orderBy: { startsAt: "asc" },
    }),
    db.appointment.findMany({
      where: { clientId: user.id },
      include: { service: true, payment: true },
      orderBy: { startsAt: "desc" },
      take: 4,
    }),
    db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);
  return (
    <>
      <div className="app-page-title">
        <div>
          <h1>
            Merhaba, <span>{user.name.split(" ")[0]}.</span>
          </h1>
          <p>Kendinize ayırdığınız zamana hoş geldiniz.</p>
        </div>
        <Link href="/randevu" className="btn btn-primary btn-sm">
          <Plus size={16} />
          Yeni randevu
        </Link>
      </div>
      <div className="stats-grid">
        {[
          {
            label: "Yaklaşan görüşme",
            value: upcoming,
            note: "Onaylanan randevularınız",
            Icon: CalendarDays,
          },
          {
            label: "Bekleyen işlem",
            value: pending,
            note: "Takip etmeniz gerekenler",
            Icon: Clock3,
          },
          {
            label: "Tamamlanan görüşme",
            value: completed,
            note: "Birlikte ayrılan zaman",
            Icon: CheckCheck,
          },
          {
            label: "Bekleyen ödeme",
            value: payments,
            note: "Ödeme adımı açık randevular",
            Icon: Wallet,
          },
        ].map(({ label, value, note, Icon }) => (
          <div className="stat-card" key={label}>
            <div className="stat-top">
              <span>{label}</span>
              <span className="stat-icon">
                <Icon size={17} strokeWidth={1.5} />
              </span>
            </div>
            <strong className="stat-value">{String(value).padStart(2, "0")}</strong>
            <span className="stat-note">{note}</span>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <div className="dashboard-main">
          {next ? (
            <section className="next-appointment">
              <div className="card-header" style={{ marginBottom: 12 }}>
                <p className="eyebrow" style={{ marginBottom: 0 }}>
                  SIRADAKİ GÖRÜŞMENİZ
                </p>
                <Badge status={next.status}>{statusLabels[next.status]}</Badge>
              </div>
              <h2>{next.service.name}</h2>
              <p>Size ayrılmış bir zaman. Kendiniz olarak gelmeniz yeterli.</p>
              <div className="next-appointment-details">
                <span>
                  <CalendarDays size={16} />
                  {formatDate(next.startsAt, { day: "numeric", month: "long", weekday: "long" })}
                </span>
                <span>
                  <Clock3 size={16} />
                  {formatTime(next.startsAt)} – {formatTime(next.endsAt)}
                </span>
                <span>
                  <Video size={16} />
                  Online
                </span>
              </div>
              <div className="button-row">
                <Link className="btn btn-primary" href={`/panel/gorusme/${next.id}`}>
                  <Video size={16} />
                  Görüşme alanına git
                </Link>
                <Link href={`/panel/randevular/${next.id}`} className="btn btn-outline">
                  Randevu ayrıntıları
                </Link>
              </div>
            </section>
          ) : (
            <section className="next-appointment">
              <p className="eyebrow">KENDİNİZE BİR ALAN</p>
              <h2>Bir sonraki adım sizin ritminizde.</h2>
              <p>Size uygun bir görüşme türü ve zaman seçebilirsiniz.</p>
              <Link href="/randevu" className="btn btn-primary">
                Randevu oluşturun
              </Link>
            </section>
          )}
          <section className="card app-card">
            <div className="card-header">
              <h2>Randevularım</h2>
              <Link href="/panel/randevular">Tümünü görüntüle</Link>
            </div>
            <AppointmentList appointments={serialize(rows)} compact />
          </section>
          <section>
            <div className="card-header" style={{ marginBottom: 15 }}>
              <h2>Size yardımcı olalım</h2>
            </div>
            <div className="quick-links">
              <Link href="/randevu" className="quick-link">
                <CalendarDays size={23} strokeWidth={1.4} />
                Randevu oluştur
              </Link>
              <Link href="/panel/degerlendirmeler" className="quick-link">
                <MessageSquare size={23} strokeWidth={1.4} />
                Deneyimini paylaş
              </Link>
              <Link href="/sikca-sorulan-sorular" className="quick-link">
                <LifeBuoy size={23} strokeWidth={1.4} />
                Sorularını yanıtlayalım
              </Link>
            </div>
          </section>
        </div>
        <aside className="dashboard-side">
          <section className="card app-card">
            <div className="card-header">
              <h2>Son bildirimler</h2>
              <Link href="/panel/bildirimler">Tümü</Link>
            </div>
            <Notifications items={serialize(notifications)} compact />
          </section>
          <section className="card app-card help-card">
            <div className="service-icon">
              <LifeBuoy size={21} strokeWidth={1.4} />
            </div>
            <h3>Bir sorunuz mu var?</h3>
            <p>Randevu süreci veya teknik konularda size yardımcı olmak için buradayız.</p>
            <Link className="text-link" href="/iletisim">
              İletişime geçin
            </Link>
          </section>
          <section className="card app-card">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 15 }}>
              <ShieldCheck size={20} color="var(--primary)" />
              <h3 style={{ margin: 0, fontSize: ".85rem" }}>Bu alan size özel.</h3>
            </div>
            <p style={{ fontSize: ".75rem", marginBottom: 0 }}>
              Değerlendirmeleriniz herkese açık paylaşılmaz. Bildirim ve gizlilik tercihlerinizi
              hesap ayarlarından yönetebilirsiniz.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
function PageTitle({
  title,
  description,
  booking = false,
}: {
  title: string;
  description: string;
  booking?: boolean;
}) {
  return (
    <div className="app-page-title">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {booking && (
        <Link href="/randevu" className="btn btn-primary btn-sm">
          <Plus size={15} />
          Yeni randevu
        </Link>
      )}
    </div>
  );
}
