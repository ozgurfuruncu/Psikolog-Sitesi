import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { legalDocuments } from "@/lib/legal";
import { CertificateGallery } from "@/components/certificate-gallery";
import { ContactForm } from "@/components/contact-form";
import { signedFileUrl } from "@/lib/files";
import {
  GraduationCap,
  UserRound,
  Clock3,
  HeartHandshake,
  Info,
  Video,
  CalendarDays,
  ShieldCheck,
  Headphones,
  Mail,
} from "lucide-react";
import { money } from "@/lib/i18n";
import { EmptyState } from "@/components/ui";
import { getSite, getProfile } from "@/lib/site";
export const dynamic = "force-dynamic";
const names: Record<string, string> = {
  hakkinda: "Uzman hakkında",
  egitim: "Eğitim ve yetkinlikler",
  sertifikalar: "Sertifikalar",
  hizmetler: "Çalışma alanları",
  "online-gorusme": "Online görüşme süreci",
  "sikca-sorulan-sorular": "Sıkça sorulan sorular",
  iletisim: "İletişim ve destek",
};
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await getSite();
  if (
    (slug === "hakkinda" && !site.showProfile) ||
    (slug === "egitim" && !site.showEducation) ||
    (slug === "sertifikalar" && !site.showCertificates)
  )
    notFound();
  return { title: legalDocuments[slug]?.title || names[slug] || "Sayfa" };
}
export default async function PublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await getSite();
  const title = legalDocuments[slug]?.title || names[slug];
  if (!title) notFound();
  let content: React.ReactNode;
  if (legalDocuments[slug]) {
    const doc = legalDocuments[slug];
    content = (
      <div className="prose">
        <div className="notice">
          <Info size={18} />
          <p>
            Taslak · Sürüm draft-1 · Mesleki ve hukuki inceleme gerektirir. Bu metin KVKK uyumluluğu
            veya hukuki yeterlilik iddiası taşımaz.
          </p>
        </div>
        {doc.sections.map((s) => (
          <section key={s.title}>
            <h2>{s.title}</h2>
            <p>{s.text}</p>
          </section>
        ))}
        <p className="small">
          İlgili başvurular için <Link href="/panel/ayarlar">hesap ayarlarını</Link>{" "}
          kullanabilirsiniz.
        </p>
      </div>
    );
  } else if (slug === "hakkinda") {
    const p = await getProfile();
    content = (
      <>
        <div className="profile-block">
          <div className="profile-placeholder">
            {p?.photoFileId ? (
              <Image
                src={signedFileUrl(p.photoFileId)}
                width={600}
                height={600}
                alt="Uzman profil fotoğrafı"
                unoptimized
              />
            ) : (
              <>
                <UserRound size={90} strokeWidth={0.65} />
                <span>Profil Fotoğrafı</span>
              </>
            )}
          </div>
          <div className="profile-copy">
            {p?.isPlaceholder && <span className="draft-label">Doldurulmayı bekleyen profil</span>}
            <h2>{p?.name}</h2>
            <p>{p?.title}</p>
            <p style={{ whiteSpace: "pre-line" }}>{p?.biography}</p>
            <p>
              <strong>Diller:</strong> {p?.languages || "Konuşulan Diller"}
            </p>
            <div className="button-row">
              {site.showEducation && (
                <Link href="/egitim" className="btn btn-outline">
                  Eğitim ve yetkinlikler
                </Link>
              )}
              {site.showCertificates && (
                <Link href="/sertifikalar" className="text-link">
                  Sertifikalar
                </Link>
              )}
            </div>
          </div>
        </div>
        <div className="grid-3" style={{ marginTop: 40 }}>
          {[
            ["Mesleki deneyim", p?.experience],
            ["Çalışma alanları", p?.areas],
            ["Yaklaşımlar", p?.approaches],
          ].map(([label, value]) => (
            <section className="card" key={label}>
              <h3>{label}</h3>
              <p className="small">
                {value || (label === "Mesleki deneyim" ? "Mesleki Deneyim" : "Uzmanlık Alanı")}
              </p>
            </section>
          ))}
        </div>
      </>
    );
  } else if (slug === "egitim") {
    const items = await db.education.findMany({
      where: { published: true },
      orderBy: { order: "asc" },
    });
    content = (
      <>
        <p className="page-intro">
          Yayımlanmasına onay verilen mesleki eğitim ve yetkinlik bilgileri. Belgeler bağımsız
          doğrulanmış olarak sunulmaz.
        </p>
        {items.length ? (
          <div className="grid-2">
            {items.map((e) => (
              <article className="card" key={e.id}>
                <GraduationCap size={30} color="var(--primary)" />
                <h3 style={{ marginTop: 20 }}>{e.qualification}</h3>
                {e.department && <p>{e.department}</p>}
                {e.degree && <p>{e.degree}</p>}
                <p>
                  {e.institution}
                  {e.year && ` · ${e.year}`}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="card">
            <EmptyState
              icon={<GraduationCap />}
              title="Eğitim bilgileri hazırlanıyor"
              description="Gerçek bilgiler uzman tarafından girilip yayımlandığında burada görüntülenecektir."
            />
          </div>
        )}
        {site.showCertificates && (
          <Link href="/sertifikalar" className="btn btn-outline" style={{ marginTop: 25 }}>
            Sertifikaları inceleyin
          </Link>
        )}
      </>
    );
  } else if (slug === "sertifikalar") {
    const certificates = await db.certificate.findMany({
      where: { published: true, redactionConfirmed: true },
      orderBy: { order: "asc" },
    });
    const ids = certificates.flatMap((c) => (c.fileId ? [c.fileId] : []));
    const files = await db.privateFile.findMany({
      where: { id: { in: ids } },
      select: { id: true, mimeType: true },
    });
    content = (
      <>
        <p className="page-intro">
          Uzmanın paylaşmayı seçtiği belgeleri inceleyebilirsiniz. Kişisel bilgilerin gizlenmesi,
          yayın öncesinde yönetici tarafından onaylanır.
        </p>
        <CertificateGallery
          items={certificates.map((c) => ({
            ...c,
            completedAt: c.completedAt?.toISOString() || null,
            url: c.fileId ? signedFileUrl(c.fileId) : null,
            mimeType: files.find((f) => f.id === c.fileId)?.mimeType || null,
          }))}
        />
      </>
    );
  } else if (slug === "hizmetler") {
    const items = await db.service.findMany({ where: { active: true }, orderBy: { order: "asc" } });
    content = (
      <>
        <div className="notice">
          <Info size={18} />
          <p>
            Geliştirme ortamındaki örnek hizmetlerdir. Gerçek hizmet kapsamı, uzman yetkisi ve
            mevzuat değerlendirmesine göre belirlenecektir. Fiyatlar test amaçlıdır.
          </p>
        </div>
        <div className="grid-3">
          {items.map((s) => (
            <article className="service-card" key={s.id}>
              <div className="service-icon">
                <HeartHandshake size={24} />
              </div>
              <h3>{s.name}</h3>
              <p>{s.description}</p>
              <p className="small">
                {s.paymentRequired
                  ? `${money(s.priceKurus)} · Uzman onayından sonra test ödemesi`
                  : "Online ödeme gerektirmez"}
              </p>
              <div className="service-meta">
                <span>
                  <Clock3 size={15} />
                  {s.durationMinutes} dakika
                </span>
                <Link href={`/randevu?service=${s.id}`}>Saat seçin</Link>
              </div>
            </article>
          ))}
        </div>
      </>
    );
  } else if (slug === "online-gorusme") {
    content = (
      <>
        <div className="page-intro">
          <p>Randevunuzdan görüşmenin sonuna kadar, her adımı hesabınızdan takip edebilirsiniz.</p>
        </div>
        <div className="grid-3">
          {[
            {
              Icon: CalendarDays,
              title: "Randevu talebinizi iletin",
              text: "Görüşme türünü seçin, uygun saatleri inceleyin ve gerekli metinleri okuyarak talebinizi gönderin. Bu aşamada randevu kesinleşmez.",
            },
            {
              Icon: ShieldCheck,
              title: "Onay ve hazırlık",
              text: "Uzman talebi değerlendirir, onaylar veya alternatif saat önerir. Gerekirse ödeme yaparsınız. Kesinleşen randevu için bildirim alırsınız.",
            },
            {
              Icon: Video,
              title: "Görüşmeye katılın",
              text: "Kamera ve mikrofonunuzu test edin. Oda, görüşmeden 10 dakika önce açılır ve yalnızca yetkili katılımcılar erişebilir.",
            },
          ].map(({ Icon, title, text }) => (
            <article className="service-card" key={title}>
              <div className="service-icon">
                <Icon />
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <div className="prose">
          <h2>Görüşme öncesi küçük hazırlıklar</h2>
          <ul>
            <li>Sessiz, özel ve bölünmeyeceğiniz bir alan seçin.</li>
            <li>Güncel tarayıcı ve istikrarlı internet bağlantısı kullanın.</li>
            <li>Kulaklığınızı, kamera ve mikrofon izinlerini kontrol edin.</li>
            <li>Teknik bir aksaklık olursa destek formundan iletişim kurun.</li>
          </ul>
          <div className="notice">
            <Info size={18} />
            <p>
              Video odası geliştirme simülasyonudur; diğer katılımcıya ses veya görüntü iletmez.
              Canlı görüşme, mesleki ve hukuki yetkiler incelenip uygun sağlayıcı yapılandırılana
              kadar kapalıdır.
            </p>
          </div>
          <p>Görüşmeler kaydedilmez. Değerlendirme isteğe bağlıdır ve herkese açık paylaşılmaz.</p>
          <Link className="btn btn-primary" href="/randevu">
            Randevu saatlerini inceleyin
          </Link>
        </div>
      </>
    );
  } else if (slug === "sikca-sorulan-sorular") {
    const faqs = await db.fAQ.findMany({ where: { published: true }, orderBy: { order: "asc" } });
    content = (
      <div className="faq-layout">
        <div>
          <p>
            Süreç hakkında net bilgi edinmek için soruları inceleyin. Yanıtını bulamadığınız bir
            konu varsa iletişim formunu kullanabilirsiniz.
          </p>
          <Link href="/iletisim" className="btn btn-outline">
            İletişime geçin
          </Link>
        </div>
        <div className="faq-list">
          {faqs.map((f) => (
            <details key={f.id}>
              <summary>{f.question}</summary>
              <p>{f.answer}</p>
            </details>
          ))}
        </div>
      </div>
    );
  } else {
    const p = await db.psychologistProfile.findUnique({ where: { id: "primary" } });
    const contactContent = await db.siteContent.findFirst({
      where: { key: "contact-info", published: true },
    });
    content = (
      <div className="grid-2">
        <section className="card">
          <h2 style={{ fontSize: "2rem" }}>
            {contactContent?.title || "Size nasıl yardımcı olabiliriz?"}
          </h2>
          <p>
            {contactContent?.body ||
              "Hesap, randevu ve teknik konulardaki sorularınızı iletebilirsiniz. Lütfen sağlık bilgisi veya görüşme içeriği paylaşmayın."}
          </p>
          <div className="notice">
            <Info size={18} />
            <p>
              Bu form bir acil destek veya kriz kanalı değildir. Acil bir tehlike varsa 112’yi
              arayın.
            </p>
          </div>
          <div className="notice notice-green">
            <Headphones size={18} />
            <p>
              Mesajlar yönetim paneline iletilir. Geliştirme ortamında gerçek iletişim hizmeti
              sunulmaz.
            </p>
          </div>
          {p?.contactEmail && (
            <p>
              <Mail
                size={18}
                style={{ display: "inline", verticalAlign: "middle", marginRight: 8 }}
              />
              <a href={`mailto:${p.contactEmail}`}>{p.contactEmail}</a>
            </p>
          )}
          {p?.contactPhone && (
            <p>
              <a href={`tel:${p.contactPhone.replace(/[^+\d]/g, "")}`}>{p.contactPhone}</a>
            </p>
          )}
          {p?.address && <p style={{ whiteSpace: "pre-line" }}>{p.address}</p>}
          {[
            ["Instagram", p?.instagramUrl],
            ["LinkedIn", p?.linkedinUrl],
            ["Sosyal medya", p?.otherSocialUrl],
          ].map(([label, url]) =>
            url ? (
              <p key={label}>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  {label}
                </a>
              </p>
            ) : null,
          )}
        </section>
        <section className="card">
          <ContactForm />
        </section>
      </div>
    );
  }
  return (
    <div className="container page-space">
      <div className="breadcrumbs">
        <Link href="/">Ana sayfa</Link>
        <span>/</span>
        <span>{title}</span>
      </div>
      <div className="page-intro">
        <p className="eyebrow">{site.siteName} · KENDİNE BİR ALAN</p>
        <h1>{title}</h1>
      </div>
      {content}
    </div>
  );
}
