import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  Clock3,
  CheckCheck,
  Wallet,
  Info,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { db } from "@/lib/db";
import { pageUser } from "@/lib/guards";
import { getOwnedAppointment, getSettings } from "@/lib/appointments";
import { serialize } from "@/lib/serialize";
import { AppointmentList } from "@/components/appointment-list";
import { AppointmentActions } from "@/components/appointment-actions";
import { PaymentList } from "@/components/payment-list";
import { VideoRoom } from "@/components/video-room";
import { AdminCalendar } from "@/components/admin-calendar";
import { AdminEditor, AdminForm, type EntityConfig } from "@/components/admin-editor";
import {
  RunJobsButton,
  PrepareReviewSession,
  BlockTimeForm,
  RemoveBlock,
  SupportAction,
  DataRequestAction,
  ProfilePhotoUpload,
  BrandingUpload,
} from "@/components/admin-tools";
import {
  serviceConfig,
  faqConfig,
  certificateConfig,
  educationConfig,
  announcementConfig,
  availabilityConfig,
  profileFields,
  settingsFields,
  siteContentConfig,
  websiteFields,
} from "@/lib/admin-config";
import { Badge, EmptyState } from "@/components/ui";
import {
  formatDate,
  formatTime,
  money,
  statusLabels,
  localDate,
  istanbulDate,
  addDays,
} from "@/lib/i18n";
import { isDemo } from "@/lib/env";
import { getProfile, getSite } from "@/lib/site";
export const dynamic = "force-dynamic";
export const metadata = { title: "Yönetim paneli" };
export default async function Admin({
  params,
  searchParams,
}: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { section = [] } = await params,
    [tab, id] = section,
    user = await pageUser(true);
  if (tab === "site-yonetimi") {
    const [site, profile, education, certificates, services] = await Promise.all([
      getSite(),
      getProfile(),
      db.education.findMany({ orderBy: { order: "asc" } }),
      db.certificate.findMany({ orderBy: { order: "asc" } }),
      db.service.findMany({ orderBy: { order: "asc" } }),
    ]);
    return (
      <>
        <Title
          title="Site Yönetimi"
          description="Site bilgilerinizi düzenleyin, kaydedin ve Siteyi görüntüle ile sonucu önizleyin."
        />
        <nav
          className="button-row"
          aria-label="Site yönetimi bölümleri"
          style={{ marginBottom: 24, flexWrap: "wrap" }}
        >
          <a href="#genel" className="btn btn-outline btn-sm">
            Genel Site Ayarları
          </a>
          <a href="#profil" className="btn btn-outline btn-sm">
            Profil Bilgileri
          </a>
          <a href="#egitim" className="btn btn-outline btn-sm">
            Eğitim Bilgileri
          </a>
          <a href="#sertifikalar" className="btn btn-outline btn-sm">
            Sertifikalar
          </a>
          <Link href="/yonetim/uygunluk" className="btn btn-outline btn-sm">
            Çalışma Saatleri
          </Link>
          <Link href="/yonetim/ayarlar" className="btn btn-outline btn-sm">
            İptal Kuralları
          </Link>
        </nav>
        <div className="settings-layout">
          <div style={{ display: "grid", gap: 24 }}>
            <section id="genel">
              <AdminForm
                endpoint="website"
                title="Genel Site Ayarları"
                fields={websiteFields}
                values={serialize(site)}
              />
            </section>
            <section id="profil">
              <AdminForm
                endpoint="profile"
                title="Profil ve İletişim Bilgileri"
                fields={profileFields}
                values={serialize(profile)}
              />
            </section>
          </div>
          <div style={{ display: "grid", gap: 24, alignContent: "start" }}>
            <BrandingUpload field="logoFileId" title="Site Logosu" />
            <BrandingUpload field="faviconFileId" title="Favicon" />
            <ProfilePhotoUpload />
            <section id="egitim">
              <AdminEditor config={educationConfig} records={serialize(education)} />
            </section>
            <section id="sertifikalar">
              <AdminEditor config={certificateConfig} records={serialize(certificates)} />
            </section>
            <AdminEditor config={serviceConfig} records={serialize(services)} />
          </div>
        </div>
      </>
    );
  }
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
          <Link href="/yonetim/randevular">Randevular</Link>
          <span>/</span>
          <span>Ayrıntılar</span>
        </div>
        <div className="app-page-title">
          <div>
            <h1>{a.service.name}</h1>
            <p>Talebi değerlendirin ve randevunun durumunu güncelleyin.</p>
          </div>
          <Badge status={a.status}>{statusLabels[a.status]}</Badge>
        </div>
        <div className="detail-layout">
          <div>
            <section className="card">
              <div className="detail-info">
                <div>
                  <label>Danışan</label>
                  <strong>{a.client.name}</strong>
                </div>
                <div>
                  <label>E-posta</label>
                  <strong style={{ overflowWrap: "anywhere" }}>{a.client.email}</strong>
                </div>
                <div>
                  <label>Tarih</label>
                  <strong>{formatDate(a.startsAt)}</strong>
                </div>
                <div>
                  <label>Saat</label>
                  <strong>
                    {formatTime(a.startsAt)} – {formatTime(a.endsAt)}
                  </strong>
                </div>
                <div>
                  <label>Süre</label>
                  <strong>{a.durationMinutes} dakika</strong>
                </div>
                <div>
                  <label>Ödeme</label>
                  <strong>
                    {a.payment?.status === "NOT_REQUIRED"
                      ? "Gerekmiyor"
                      : `${money(a.priceKurus)} · ${statusLabels[a.payment?.status || ""]}`}
                  </strong>
                </div>
              </div>
              {a.feedback && (
                <div className="notice notice-green">
                  <ShieldCheck size={17} />
                  <p>
                    Özel değerlendirme: {a.feedback.overall}/5
                    <br />
                    {a.feedback.comment}
                  </p>
                </div>
              )}
            </section>
            <section className="card" style={{ marginTop: 24 }}>
              <h3>İşlem geçmişi</h3>
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
            <h3>Randevu işlemleri</h3>
            <AppointmentActions appointment={serialize(a)} admin />
            {isDemo() && ["CONFIRMED", "IN_PROGRESS"].includes(a.status) && (
              <div style={{ marginTop: 20 }}>
                <p className="small muted">
                  Yalnızca test için randevu saatini şimdiye alır. Gerçek görüşme yapılmaz.
                </p>
                <PrepareReviewSession appointmentId={a.id} />
              </div>
            )}
          </aside>
        </div>
      </>
    );
  }
  if (tab === "randevular") {
    const rows = await db.appointment.findMany({
      include: { service: true, payment: true, client: { select: { name: true, email: true } } },
      orderBy: { startsAt: "desc" },
      take: 500,
    });
    return (
      <>
        <Title
          title="Randevu yönetimi"
          description="Talep, onay, saat önerisi ve görüşme durumlarını yönetin."
        />
        <div className="card">
          <AppointmentList appointments={serialize(rows)} admin />
        </div>
      </>
    );
  }
  if (tab === "takvim") {
    const [appointments, blocks] = await Promise.all([
      db.appointment.findMany({
        include: { service: true, client: { select: { name: true, email: true } } },
        orderBy: { startsAt: "asc" },
        take: 1000,
      }),
      db.blockedTime.findMany(),
    ]);
    return (
      <>
        <Title
          title="Takvim"
          description="Gün, hafta veya ay görünümünde randevularınızı takip edin."
        />
        <AdminCalendar appointments={serialize(appointments)} blocks={serialize(blocks)} />
      </>
    );
  }
  if (tab === "gorusme" && id) {
    let a;
    try {
      a = await getOwnedAppointment(user, id);
    } catch {
      notFound();
    }
    return (
      <>
        <Title
          title="Görüşme alanı"
          description="Yalnızca yetkili yönetici ve atanmış danışan erişebilir."
        />
        <VideoRoom appointment={serialize(a)} admin demo={isDemo()} />
      </>
    );
  }
  if (tab === "danisanlar") {
    if (id) {
      const client = await db.user.findFirst({
        where: { id, role: "CLIENT" },
        include: {
          profile: true,
          consents: { orderBy: { acceptedAt: "desc" } },
          appointments: {
            include: { service: true, payment: true },
            orderBy: { startsAt: "desc" },
          },
        },
      });
      if (!client) notFound();
      return (
        <>
          <Title title={client.name} description="Yetkili iletişim, randevu ve onam kayıtları." />
          <div className="grid-2">
            <div className="card">
              <h3>İletişim bilgileri</h3>
              <p>
                {client.email}
                <br />
                {client.profile?.phone || "Telefon belirtilmedi"}
              </p>
              <p className="small">
                Yetişkinlik beyanı: {client.adultConfirmed ? "Var" : "Yok"}
                <br />
                E-posta: {client.emailVerified ? "Doğrulandı" : "Doğrulanmadı"}
              </p>
            </div>
            <div className="card">
              <h3>Onam kayıtları</h3>
              {client.consents.map((c) => (
                <p key={c.id} className="small">
                  {(
                    {
                      PRIVACY: "Gizlilik",
                      TERMS: "Kullanım koşulları",
                      ADULT: "Yetişkinlik beyanı",
                      INFORMED_CONSENT: "Bilgilendirilmiş onam",
                      CANCELLATION: "İptal koşulları",
                    } as Record<string, string>
                  )[c.documentType] || c.documentType}{" "}
                  · {c.documentVersion}
                  <br />
                  <span className="muted">
                    {formatDate(c.acceptedAt, {
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </p>
              ))}
            </div>
          </div>
          <div className="card" style={{ marginTop: 24 }}>
            <h3>Randevu ve ödeme geçmişi</h3>
            <AppointmentList appointments={serialize(client.appointments)} compact admin />
          </div>
        </>
      );
    }
    const { q } = await searchParams;
    const clients = await db.user.findMany({
      where: {
        role: "CLIENT",
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { _count: { select: { appointments: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return (
      <>
        <Title
          title="Danışanlar"
          description="Yalnızca yetkili operasyonel bilgilere erişin. Klinik kayıt tutulmaz."
        />
        <div className="card">
          <form className="list-toolbar">
            <input
              className="input"
              name="q"
              defaultValue={q}
              placeholder="Ad veya e-posta ara…"
              aria-label="Danışan ara"
            />
            <button className="btn btn-outline">Ara</button>
          </form>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Danışan</th>
                  <th>E-posta</th>
                  <th>Görüşme</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="client-row">
                        <span className="avatar">{c.name.charAt(0)}</span>
                        <strong>{c.name}</strong>
                      </div>
                    </td>
                    <td>{c.email}</td>
                    <td>{c._count.appointments}</td>
                    <td>
                      <Link href={`/yonetim/danisanlar/${c.id}`} className="table-action">
                        Profili incele
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  }
  if (tab === "odemeler") {
    const payments = await db.payment.findMany({
      include: {
        appointment: { include: { service: true, client: { select: { name: true } } } },
        refunds: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return (
      <>
        <Title
          title="Ödemeler ve iadeler"
          description="İşlem durumları ve iade talepleri. Kart bilgisi saklanmaz."
        />
        <PaymentList payments={serialize(payments)} admin demo={isDemo()} />
      </>
    );
  }
  if (tab === "degerlendirmeler") {
    const [items, aggregate] = await Promise.all([
      db.feedback.findMany({
        include: {
          appointment: { include: { service: true, client: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      db.feedback.aggregate({
        _avg: { overall: true, communication: true, booking: true, technical: true },
        _count: { id: true },
      }),
    ]);
    return (
      <>
        <Title
          title="Özel değerlendirmeler"
          description="Görüşme sonrası isteğe bağlı geri bildirimler. Kamuya açık yayımlanmaz."
        />
        <div className="stats-grid">
          {[
            ["Genel deneyim", aggregate._avg.overall],
            ["İletişim", aggregate._avg.communication],
            ["Randevu süreci", aggregate._avg.booking],
            ["Teknik kalite", aggregate._avg.technical],
          ].map(([label, value]) => (
            <div className="stat-card" key={label}>
              <span className="stat-top">{label}</span>
              <strong className="stat-value">
                {typeof value === "number" ? value.toFixed(1) : "–"}
                <small style={{ fontSize: ".9rem" }}> / 5</small>
              </strong>
              <span className="stat-note">{aggregate._count.id} özel değerlendirme</span>
            </div>
          ))}
        </div>
        {items.length ? (
          <div className="grid-2">
            {items.map((f) => (
              <article className="card" key={f.id}>
                <div className="card-header">
                  <h3>{f.appointment.client.name}</h3>
                  <ShieldCheck size={18} color="var(--primary)" />
                </div>
                <p className="small">
                  {f.appointment.service.name} · {formatDate(f.appointment.startsAt)}
                </p>
                <Badge>Özel · Genel deneyim {f.overall}/5</Badge>
                <p className="small" style={{ marginTop: 20 }}>
                  İletişim {f.communication}/5 · Süreç {f.booking}/5 · Teknik {f.technical}/5
                </p>
                {f.comment && <p className="feedback-comment">{f.comment}</p>}
              </article>
            ))}
          </div>
        ) : (
          <div className="card">
            <EmptyState
              icon={<MessageSquare />}
              title="Henüz değerlendirme yok"
              description="Tamamlanan görüşmeler için paylaşılan özel yanıtlar burada görünür."
            />
          </div>
        )}
      </>
    );
  }
  if (tab === "profil") {
    const [profile, education, certificates] = await Promise.all([
      db.psychologistProfile.findUniqueOrThrow({ where: { id: "primary" } }),
      db.education.findMany({ orderBy: { order: "asc" } }),
      db.certificate.findMany({ orderBy: { order: "asc" } }),
    ]);
    return (
      <>
        <Title
          title="Profesyonel profil"
          description="Yalnızca gerçek mesleki bilgilerinizi ve yayın izni olan belgelerinizi paylaşın."
        />
        <div className="notice">
          <Info size={18} />
          <p>
            Eğitim, unvan ve deneyim bilgileri bağımsız doğrulanmış olarak sunulmaz. Gerçek bilgiler
            tamamlanana kadar profilin örnek etiketi açık kalmalıdır.
          </p>
        </div>
        <div className="settings-layout">
          <AdminForm
            endpoint="profile"
            title="Profil bilgileri"
            fields={profileFields}
            values={serialize(profile)}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <ProfilePhotoUpload />
            <AdminEditor config={educationConfig} records={serialize(education)} />
            <AdminEditor config={certificateConfig} records={serialize(certificates)} />
          </div>
        </div>
      </>
    );
  }
  if (tab === "icerik") {
    const [services, faqs, posts, categories, announcements, contents] = await Promise.all([
      db.service.findMany({ orderBy: { order: "asc" } }),
      db.fAQ.findMany({ orderBy: { order: "asc" } }),
      db.blogPost.findMany({ orderBy: { updatedAt: "desc" } }),
      db.blogCategory.findMany(),
      db.announcement.findMany({ orderBy: { createdAt: "desc" } }),
      db.siteContent.findMany(),
    ]);
    const blogConfig: EntityConfig = {
      endpoint: "blog",
      title: "Yazılar",
      defaults: {
        title: "",
        slug: "",
        excerpt: "",
        content: "",
        categoryId: "",
        seoTitle: "",
        seoDescription: "",
        published: false,
        reviewed: false,
      },
      fields: [
        { key: "title", label: "Başlık", required: true },
        {
          key: "slug",
          label: "Sayfa yolu",
          required: true,
          help: "Küçük Latin harfler, rakam ve tire.",
        },
        {
          key: "categoryId",
          label: "Kategori",
          type: "select",
          options: [
            { value: "", label: "Kategori yok" },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
          ],
        },
        { key: "excerpt", label: "Kısa açıklama", type: "textarea" },
        { key: "content", label: "Yazı içeriği (düz metin)", type: "textarea", required: true },
        { key: "seoTitle", label: "Arama motoru başlığı" },
        { key: "seoDescription", label: "Arama motoru açıklaması" },
        { key: "reviewed", label: "İçerik yetkili uzman tarafından incelendi", type: "checkbox" },
        { key: "published", label: "Yayımla", type: "checkbox" },
      ],
    };
    return (
      <>
        <Title
          title="İçerik yönetimi"
          description="Hizmetler, yazılar, sorular ve duyurular. Yayın durumunu siz belirlersiniz."
        />
        <div className="admin-content-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <AdminEditor config={serviceConfig} records={serialize(services)} />
            <AdminEditor config={faqConfig} records={serialize(faqs)} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <AdminEditor config={blogConfig} records={serialize(posts)} />
            <AdminEditor config={announcementConfig} records={serialize(announcements)} />
            <AdminEditor config={siteContentConfig} records={serialize(contents)} />
          </div>
        </div>
      </>
    );
  }
  if (tab === "uygunluk") {
    const [rules, blocks] = await Promise.all([
      db.availabilityRule.findMany({ orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }] }),
      db.blockedTime.findMany({ orderBy: { startsAt: "asc" } }),
    ]);
    return (
      <>
        <Title
          title="Çalışma saatleri"
          description="Haftalık çalışma, öğle arası, özel tarih, tatil ve kapalı zamanlar."
        />
        <div className="notice notice-green">
          <Clock3 size={18} />
          <p>
            Öğle araları için aynı güne iki çalışma aralığı ekleyin. Belirli tarihe ait aktif
            kurallar o günün haftalık kurallarının yerini alır. Tatil için tüm günü kapatın. Saatler
            İstanbul saatidir.
          </p>
        </div>
        <div className="settings-layout">
          <AdminEditor config={availabilityConfig} records={serialize(rules)} />
          <div>
            <BlockTimeForm />
            <div className="card" style={{ marginTop: 24 }}>
              <h3>Kapalı zamanlar</h3>
              {blocks.length ? (
                blocks.map((b) => (
                  <div className="content-record" key={b.id}>
                    <div>
                      <h3>{b.reason}</h3>
                      <p>
                        {formatDate(b.startsAt)} · {formatTime(b.startsAt)}
                        <br />
                        {formatDate(b.endsAt)} · {formatTime(b.endsAt)}
                      </p>
                    </div>
                    <RemoveBlock id={b.id} />
                  </div>
                ))
              ) : (
                <p className="small">Henüz kapalı zaman eklenmedi.</p>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }
  if (tab === "ayarlar") {
    const settings = await getSettings();
    return (
      <>
        <Title
          title="Ayarlar"
          description="Randevu kuralları ve entegrasyonların yapılandırma durumu."
        />
        <div className="settings-layout">
          <AdminForm
            endpoint="settings"
            title="Site ve randevu kuralları"
            fields={settingsFields}
            values={serialize(settings)}
          />
          <div>
            <section className="card">
              <h3>Entegrasyon durumu</h3>
              {[
                {
                  name: "Ödeme",
                  status:
                    process.env.PAYMENT_PROVIDER === "iyzico"
                      ? "iyzico sandbox"
                      : "Geliştirme simülasyonu",
                  description: process.env.IYZICO_API_KEY
                    ? "Anahtar tanımlı; canlı işlem kapalı"
                    : "iyzico sandbox anahtarları tanımlı değil",
                },
                {
                  name: "Video",
                  status: "Canlı hizmet kapalı",
                  description: "Hukuki inceleme ve yetkili sağlayıcı gerekiyor",
                },
                {
                  name: "E-posta",
                  status: process.env.EMAIL_PROVIDER === "smtp" ? "SMTP" : "Geliştirme önizlemesi",
                  description: "Gerçek teslimat için SMTP ve arka plan çalışanını yapılandırın",
                },
                {
                  name: "Saat dilimi",
                  status: "Europe/Istanbul",
                  description: "Veritabanında UTC, ekranda Türkiye saati",
                },
                {
                  name: "Hatırlatmalar",
                  status: settings.reminderHours.map((h) => `${h} saat`).join(" / "),
                  description: "Varsayılan: randevudan 24 ve 1 saat önce",
                },
              ].map((x) => (
                <div className="integration-status" key={x.name}>
                  <div>
                    <strong>{x.name}</strong>
                    <p>{x.description}</p>
                  </div>
                  <Badge>{x.status}</Badge>
                </div>
              ))}
            </section>
            <section className="card" style={{ marginTop: 24 }}>
              <h3>Bildirim ve süre kontrolleri</h3>
              <p className="small">
                Süresi dolan saatleri serbest bırakır, hatırlatmaları ve e-posta kuyruğunu işler.
                Otomatik çalışma için ayrı iş sürecini başlatın.
              </p>
              <RunJobsButton />
            </section>
            <div className="notice">
              <Info size={18} />
              <p>
                Canlı ödeme ve görüşme hizmetleri varsayılan olarak kapalıdır. Mesleki yetki, KVKK,
                uzaktan hizmet ve uluslararası aktarım incelemeleri tamamlanmadan gerçek danışan
                verisi kullanılmamalıdır.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }
  if (tab === "destek") {
    const [requests, support] = await Promise.all([
      db.dataRequest.findMany({
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      db.supportRequest.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    ]);
    return (
      <>
        <Title
          title="Destek ve veri talepleri"
          description="Operasyonel başvuruları yetkili kapsamda inceleyin."
        />
        <div className="grid-2">
          <section>
            <h3>Teknik destek</h3>
            {support.length ? (
              support.map((s) => (
                <article className="card" key={s.id} style={{ marginBottom: 20 }}>
                  <h3>{s.subject}</h3>
                  <p className="small">
                    {s.name} · {s.email}
                  </p>
                  <p className="small" style={{ whiteSpace: "pre-wrap" }}>
                    {s.message}
                  </p>
                  <div className="card-header" style={{ marginBottom: 0 }}>
                    <Badge>{s.status === "OPEN" ? "Açık" : "Çözüldü"}</Badge>
                    <SupportAction id={s.id} status={s.status} />
                  </div>
                </article>
              ))
            ) : (
              <div className="card">
                <p className="small" style={{ margin: 0 }}>
                  Henüz destek talebi yok.
                </p>
              </div>
            )}
          </section>
          <section>
            <h3>Kişisel veri başvuruları</h3>
            {requests.length ? (
              requests.map((r) => (
                <article className="card" key={r.id} style={{ marginBottom: 20 }}>
                  <h3>{r.user.name}</h3>
                  <p className="small">
                    {r.user.email}
                    <br />
                    {
                      (
                        {
                          ACCESS: "Veriye erişim",
                          CORRECTION: "Düzeltme",
                          DELETION: "Silme",
                        } as Record<string, string>
                      )[r.type]
                    }{" "}
                    ·{" "}
                    {r.status === "PENDING"
                      ? "İnceleme bekliyor"
                      : r.status === "REVIEWING"
                        ? "İnceleniyor"
                        : r.status === "RESOLVED"
                          ? "Sonuçlandı"
                          : "Olumsuz sonuçlandı"}
                  </p>
                  <p className="small" style={{ whiteSpace: "pre-wrap" }}>
                    {r.details}
                  </p>
                  {r.resolution && <p className="small">Yanıt: {r.resolution}</p>}
                  <DataRequestAction id={r.id} />
                </article>
              ))
            ) : (
              <div className="card">
                <p className="small" style={{ margin: 0 }}>
                  Henüz veri başvurusu yok.
                </p>
              </div>
            )}
            <div className="notice">
              <Info size={16} />
              <p>
                Silme talebinin sonuçlandırılması kayıtları otomatik silmez. Kimlik, saklama
                yükümlülüğü ve veri kapsamı incelenip belgelenmelidir.
              </p>
            </div>
          </section>
        </div>
      </>
    );
  }
  if (tab === "posta") {
    if (!isDemo()) notFound();
    const emails = await db.emailDelivery.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
    return (
      <>
        <Title
          title="Geliştirme posta kutusu"
          description="Yalnızca demo yöneticisine açık. Gerçek e-posta teslimatı yapılmaz."
        />
        <RunJobsButton />
        {emails.map((e) => (
          <article className="card" key={e.id} style={{ marginTop: 20 }}>
            <div className="card-header">
              <h3>{e.subject}</h3>
              <Badge>
                {(
                  {
                    PENDING: "Kuyrukta",
                    PROCESSING: "İşleniyor",
                    PREVIEW: "Önizleme",
                    DELIVERED: "Gönderildi",
                    FAILED: "Başarısız",
                  } as Record<string, string>
                )[e.status] || "Bekliyor"}
              </Badge>
            </div>
            <p className="small">
              Alıcı: {e.recipient} ·{" "}
              {formatDate(e.createdAt, {
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p className="small" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {e.text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                part.startsWith("http") ? (
                  <a key={i} className="text-link" href={part} target="_blank" rel="noreferrer">
                    İşlem bağlantısını açın
                  </a>
                ) : (
                  <span key={i}>{part}</span>
                ),
              )}
            </p>
          </article>
        ))}
      </>
    );
  }
  if (tab) notFound();
  const today = localDate(),
    start = istanbulDate(today, 0),
    end = istanbulDate(addDays(today, 1), 0),
    month = istanbulDate(today.slice(0, 7) + "-01", 0);
  const [
    todayCount,
    pending,
    completed,
    cancelled,
    pendingPayments,
    revenue,
    appointments,
    upcoming,
    clients,
    allThisMonth,
    rules,
    blocks,
  ] = await Promise.all([
    db.appointment.count({
      where: {
        startsAt: { gte: start, lt: end },
        status: { notIn: ["CANCELLED", "REJECTED", "EXPIRED"] },
      },
    }),
    db.appointment.count({
      where: { status: { in: ["PENDING_APPROVAL", "ALTERNATIVE_PROPOSED"] } },
    }),
    db.appointment.count({ where: { status: "COMPLETED" } }),
    db.appointment.count({ where: { status: "CANCELLED" } }),
    db.payment.count({
      where: { status: { in: ["PENDING", "FAILED"] }, appointment: { status: "AWAITING_PAYMENT" } },
    }),
    db.payment.aggregate({
      where: { status: "PAID", updatedAt: { gte: month } },
      _sum: { amountKurus: true },
    }),
    db.appointment.findMany({
      where: { status: { in: ["PENDING_APPROVAL", "ALTERNATIVE_PROPOSED"] } },
      include: { service: true, client: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.appointment.findMany({
      where: { status: { in: ["CONFIRMED", "IN_PROGRESS"] }, endsAt: { gte: new Date() } },
      include: { service: true, client: { select: { name: true, email: true } } },
      orderBy: { startsAt: "asc" },
      take: 5,
    }),
    db.user.count({ where: { role: "CLIENT" } }),
    db.appointment.findMany({
      where: {
        startsAt: { gte: month },
        status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED"] },
      },
      select: { startsAt: true, durationMinutes: true },
    }),
    db.availabilityRule.findMany({ where: { active: true } }),
    db.blockedTime.findMany({ where: { endsAt: { gte: month } } }),
  ]);
  let capacity = 0;
  const year = Number(today.slice(0, 4)),
    mon = Number(today.slice(5, 7)),
    days = new Date(year, mon, 0).getDate();
  for (let day = 1; day <= days; day++) {
    const date = `${today.slice(0, 7)}-${String(day).padStart(2, "0")}`,
      dow = new Date(date + "T12:00:00+03:00").getUTCDay(),
      custom = rules.filter((r) => r.date === date),
      dayRules = custom.length
        ? custom
        : rules.filter((r) => r.date === null && r.dayOfWeek === dow);
    for (const r of dayRules) {
      const from = istanbulDate(date, r.startMinute),
        to = istanbulDate(date, r.endMinute);
      let minutes = r.endMinute - r.startMinute;
      for (const b of blocks)
        minutes -= Math.max(
          0,
          (Math.min(to.getTime(), b.endsAt.getTime()) -
            Math.max(from.getTime(), b.startsAt.getTime())) /
            60000,
        );
      capacity += Math.max(0, minutes);
    }
  }
  const booked = allThisMonth
      .filter((a) => localDate(a.startsAt).slice(0, 7) === today.slice(0, 7))
      .reduce((n, a) => n + a.durationMinutes, 0),
    occupancy = capacity ? Math.round((booked / capacity) * 100) : 0;
  return (
    <>
      <Title
        title="Güne sakin bir başlangıç."
        description="Randevularınız ve platformunuzla ilgili güncel görünüm."
      />
      <div className="stats-grid">
        {[
          {
            label: "Bugünün randevuları",
            value: String(todayCount).padStart(2, "0"),
            note: "Gün içindeki randevular",
            Icon: CalendarDays,
          },
          {
            label: "Bekleyen talepler",
            value: String(pending).padStart(2, "0"),
            note: "Yanıtınızı bekliyor",
            Icon: Clock3,
          },
          {
            label: "Tamamlanan görüşme",
            value: String(completed).padStart(2, "0"),
            note: `${cancelled} iptal edilen randevu`,
            Icon: CheckCheck,
          },
          {
            label: "Bu ayki gelir",
            value: money(revenue._sum.amountKurus || 0),
            note: isDemo() ? "Kurgusal test ödemeleri" : "Doğrulanan ödemeler",
            Icon: Wallet,
          },
        ].map(({ label, value, note, Icon }) => (
          <div className="stat-card" key={label}>
            <div className="stat-top">
              <span>{label}</span>
              <span className="stat-icon">
                <Icon size={17} />
              </span>
            </div>
            <strong className="stat-value">{value}</strong>
            <span className="stat-note">{note}</span>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <section className="card app-card">
            <div className="card-header">
              <h2>Yanıt bekleyen talepler</h2>
              <Link href="/yonetim/randevular">Tümünü görüntüle</Link>
            </div>
            <AppointmentList appointments={serialize(appointments)} admin compact />
          </section>
          <section className="card app-card">
            <div className="card-header">
              <h2>Yaklaşan görüşmeler</h2>
              <Link href="/yonetim/takvim">Takvimi aç</Link>
            </div>
            <AppointmentList appointments={serialize(upcoming)} admin compact />
          </section>
        </div>
        <aside className="dashboard-side">
          <section className="card app-card">
            <h3>Platform görünümü</h3>
            <div className="booking-summary-row">
              <span>Danışan hesabı</span>
              <strong>{clients}</strong>
            </div>
            <div className="booking-summary-row">
              <span>Ödeme adımı açık</span>
              <strong>{pendingPayments}</strong>
            </div>
            <div className="booking-summary-row">
              <span>Aylık takvim doluluğu</span>
              <strong>%{occupancy}</strong>
            </div>
            <p
              className="small muted"
              style={{ fontSize: ".7rem", marginTop: 12, marginBottom: 0 }}
            >
              Doluluk: bu ayki onaylı/tamamlanan görüşme dakikaları ÷ tanımlı çalışma dakikaları.
              Kapalı aralıklar düşülür.
            </p>
          </section>
          <section className="card app-card help-card">
            <div className="service-icon">
              <CalendarDays size={21} />
            </div>
            <h3>Takviminize alan açın.</h3>
            <p>
              Çalışma saatlerinizi ve kapalı zamanları düzenleyin. Randevu arası süreler otomatik
              uygulanır.
            </p>
            <Link href="/yonetim/uygunluk" className="text-link">
              Uygunluğu düzenle
            </Link>
          </section>
          <section className="card app-card">
            <h3 style={{ fontSize: ".9rem" }}>Canlı hizmet öncesi</h3>
            <p style={{ fontSize: ".75rem" }}>
              Gerçek uzman bilgilerini tamamlayın. Mesleki yetki, gizlilik ve uzaktan hizmet
              gerekliliklerini inceleyin. Geliştirme ödemeleri gerçek para hareketi oluşturmaz.
            </p>
            <Link href="/yonetim/ayarlar" className="text-link">
              Entegrasyon durumları
            </Link>
          </section>
        </aside>
      </div>
    </>
  );
}
function Title({ title, description }: { title: string; description: string }) {
  return (
    <div className="app-page-title">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <Link href="/" className="btn btn-outline btn-sm">
        Siteyi görüntüle
      </Link>
    </div>
  );
}
