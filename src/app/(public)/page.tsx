import Link from "next/link";
import Image from "next/image";
import {
  CalendarDays,
  LockKeyhole,
  Video,
  ShieldCheck,
  Sprout,
  HeartHandshake,
  Clock3,
  BookOpen,
  MessageCircle,
  UserRound,
  GraduationCap,
  Languages,
  Leaf,
  MonitorCheck,
} from "lucide-react";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/i18n";
import { signedFileUrl } from "@/lib/files";
export const dynamic = "force-dynamic";
export default async function Home() {
  const [services, profile, faqs, posts, announcements, contents] = await Promise.all([
    db.service.findMany({ where: { active: true }, orderBy: { order: "asc" }, take: 3 }),
    db.psychologistProfile.findUnique({ where: { id: "primary" } }),
    db.fAQ.findMany({ where: { published: true }, orderBy: { order: "asc" }, take: 4 }),
    db.blogPost.findMany({
      where: { published: true, reviewed: true },
      orderBy: { publishedAt: "desc" },
      take: 3,
      include: { category: true },
    }),
    db.announcement.findMany({
      where: { published: true },
      take: 2,
      orderBy: { createdAt: "desc" },
    }),
    db.siteContent.findMany({ where: { published: true } }),
  ]);
  const contentsList = contents;
  const introduction = contentsList.find((c) => c.key === "home-introduction");
  const icons = [HeartHandshake, MessageCircle, Sprout];
  return (
    <>
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">DURAK · ONLİNE GÖRÜŞME PLATFORMU</p>
              {introduction ? (
                <h1>{introduction.title}</h1>
              ) : (
                <h1>
                  Biraz yavaşlayın.
                  <br />
                  Kendinize <em>kulak verin.</em>
                </h1>
              )}
              <p>
                {introduction?.body ||
                  "Bazen ihtiyacımız olan, durup kendimizi duyabileceğimiz bir alandır. Kendinizi tanımaya ve hayatınıza dair konuşmaya kendi ritminizde başlayın."}
              </p>
              <div className="button-row">
                <Link href="/randevu" className="btn btn-primary">
                  <CalendarDays size={17} />
                  Randevu oluşturun
                </Link>
                <Link href="/online-gorusme" className="btn btn-outline">
                  Süreci keşfedin
                </Link>
              </div>
              <div className="hero-assurances">
                <span>
                  <LockKeyhole size={14} />
                  Gizliliğe duyarlı
                </span>
                <span>
                  <Video size={15} />
                  Bulunduğunuz yerden
                </span>
                <span>
                  <Sprout size={15} />
                  Kendi ritminizde
                </span>
              </div>
            </div>
            <figure className="hero-visual">
              <Image
                priority
                src="/images/calm-room.jpg"
                alt="Doğal ışık alan, yeşil bitkiler ve rahat oturma alanı bulunan temsili bir iç mekân"
                width={1000}
                height={1200}
                className="hero-photo"
              />
              <figcaption className="hero-caption">
                <Leaf size={32} strokeWidth={1.2} />
                <div>
                  <strong>Size ayrılmış bir zaman.</strong>
                  <span>Yargılanmadan, acele etmeden, kendiniz olarak.</span>
                </div>
              </figcaption>
              <span className="hero-credit">Temsili mekân görseli · Unsplash</span>
            </figure>
          </div>
          <div className="trust-strip">
            <div>
              <ShieldCheck size={27} strokeWidth={1.4} />
              <div>
                <strong>Gizlilik odaklı yaklaşım</strong>
                <span>Bilgilerinize kontrollü erişim</span>
              </div>
            </div>
            <div>
              <MonitorCheck size={27} strokeWidth={1.4} />
              <div>
                <strong>Kolay randevu süreci</strong>
                <span>Size uygun zamanı seçin</span>
              </div>
            </div>
            <div>
              <UserRound size={27} strokeWidth={1.4} />
              <div>
                <strong>Yetişkinlere yönelik</strong>
                <span>18 yaş ve üzeri bireyler için</span>
              </div>
            </div>
            <div>
              <Clock3 size={27} strokeWidth={1.4} />
              <div>
                <strong>Kendi alanınızdan</strong>
                <span>Görüşme öncesi teknik hazırlık</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      {[...announcements, ...contentsList.filter((c) => c.key === "home-note")].map((a) => (
        <div className="container" key={a.id}>
          <div className="notice">
            <MessageCircle size={18} />
            <p>
              <strong>{a.title}</strong>
              <br />
              {a.body}
            </p>
          </div>
        </div>
      ))}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">ÇALIŞMA ALANLARI</p>
              <h2>İhtiyacınıza alan açın.</h2>
            </div>
            <p>
              Görüşme türlerini ve süreci inceleyerek size uygun başlangıcı belirleyebilirsiniz.
            </p>
          </div>
          <div className="grid-3">
            {services.map((s, i) => {
              const Icon = icons[i % 3];
              return (
                <article className="service-card" key={s.id}>
                  <div className="service-icon">
                    <Icon size={24} strokeWidth={1.4} />
                  </div>
                  <h3>{s.name}</h3>
                  <p>{s.description}</p>
                  <div className="service-meta">
                    <span>
                      <Clock3 size={14} />
                      {s.durationMinutes} dakika
                    </span>
                    <Link href={`/randevu?service=${s.id}`}>İnceleyin</Link>
                  </div>
                </article>
              );
            })}
          </div>
          <p className="muted small" style={{ marginTop: 20 }}>
            Geliştirme ortamı: Hizmet örnekleri, uzman yetkileri ve yasal değerlendirme sonrasında
            kesinleşecektir.
          </p>
        </div>
      </section>
      <section className="section soft-section">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">ADIM ADIM SÜREÇ</p>
              <h2>İlk adım, düşündüğünüzden yakın.</h2>
            </div>
            <Link href="/online-gorusme" className="text-link">
              Sürece yakından bakın
            </Link>
          </div>
          <div className="process-grid">
            {[
              {
                Icon: CalendarDays,
                title: "Size uygun zamanı seçin",
                text: "Görüşme türünü ve uygun saatleri inceleyin. Hesabınızı oluşturarak randevu talebinizi iletin.",
              },
              {
                Icon: MessageCircle,
                title: "Randevunuz birlikte netleşsin",
                text: "Uzman talebinizi değerlendirsin. Gerekirse önerilen yeni saati onaylayın ve ödeme adımını tamamlayın.",
              },
              {
                Icon: Video,
                title: "Kendi alanınızdan katılın",
                text: "Görüşme öncesi cihazınızı kontrol edin. Randevu saatinizde hesabınızdan güvenli odaya erişin.",
              },
            ].map(({ Icon, title, text }) => (
              <div className="process-step" key={title}>
                <div className="step-icon">
                  <Icon size={23} strokeWidth={1.4} />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
          <div className="process-note">
            <LockKeyhole size={15} />
            Görüşmeler varsayılan olarak kaydedilmez. Canlı görüşme hizmeti, gerekli mesleki ve
            hukuki incelemelerden sonra açılacaktır.
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container profile-block">
          <div className="profile-placeholder">
            {profile?.photoFileId ? (
              <Image
                src={signedFileUrl(profile.photoFileId)}
                alt="Uzman profil fotoğrafı"
                width={600}
                height={600}
                unoptimized
              />
            ) : (
              <>
                <UserRound size={85} strokeWidth={0.65} />
                <span>Uzman fotoğrafı eklenecek</span>
              </>
            )}
          </div>
          <div className="profile-copy">
            <p className="eyebrow">UZMANINIZI TANIYIN</p>
            {profile?.isPlaceholder && (
              <span className="draft-label">Bilgiler henüz tamamlanmadı</span>
            )}
            <h2>{profile?.isPlaceholder ? "Güven, tanımakla başlar." : profile?.name}</h2>
            <p>{profile?.biography}</p>
            <div className="profile-meta">
              <span>
                <GraduationCap size={18} />
                Eğitim ve yetkinlikler
              </span>
              <span>
                <Languages size={18} />
                {profile?.languages || "Türkçe"}
              </span>
            </div>
            <Link className="btn btn-outline" href="/hakkinda">
              Uzman profilini inceleyin
            </Link>
          </div>
        </div>
      </section>
      <section className="section soft-section faq-section">
        <div className="container faq-layout">
          <div>
            <p className="eyebrow">AKLINIZDAKİ SORULAR</p>
            <h2>Başlamadan önce.</h2>
            <p>
              İlk adımda sorularınız olması çok doğal. Süreçle ilgili merak ettiklerinizi birlikte
              netleştirelim.
            </p>
            <Link href="/sikca-sorulan-sorular" className="text-link">
              Tüm soruları inceleyin
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
      </section>
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">BİLGİ VE PAYLAŞIM</p>
              <h2>Biraz okumaya alan açın.</h2>
            </div>
            <Link className="text-link" href="/blog">
              Tüm yazıları keşfedin
            </Link>
          </div>
          {posts.length ? (
            <div className="grid-3">
              {posts.map((post, i) => (
                <Link href={`/blog/${post.slug}`} className="blog-card" key={post.id}>
                  <div className={`blog-art blog-art-${i}`}>
                    {post.imageFileId ? (
                      <Image
                        src={signedFileUrl(post.imageFileId)}
                        alt=""
                        width={600}
                        height={300}
                        unoptimized
                      />
                    ) : i === 0 ? (
                      <Image
                        src="/images/forest.jpg"
                        alt="Güneş ışığının süzüldüğü yeşil orman"
                        width={600}
                        height={300}
                      />
                    ) : (
                      <BookOpen size={50} strokeWidth={0.7} />
                    )}
                  </div>
                  <div className="blog-body">
                    <span className="blog-category">
                      {post.category?.name || "Platform rehberi"}
                    </span>
                    <h3>{post.title}</h3>
                    <p>{post.excerpt}</p>
                    <time className="blog-date">
                      {formatDate(post.publishedAt || post.createdAt)}
                    </time>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p>Uzman incelemesinden geçen yazılar burada paylaşılacak.</p>
          )}
        </div>
      </section>
      <div className="container">
        <div className="cta-section">
          <div>
            <h2>Kendinize bir zaman ayırın.</h2>
            <p>Size uygun bir saat seçerek ilk adımı atabilirsiniz.</p>
          </div>
          <Link href="/randevu" className="btn btn-primary">
            <CalendarDays size={17} />
            Randevu oluşturun
          </Link>
        </div>
      </div>
    </>
  );
}
