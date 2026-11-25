import "dotenv/config";
import { db } from "../src/lib/db";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";
import { istanbulDate, localDate, addDays } from "../src/lib/i18n";
import { isReview } from "../src/lib/env";
if ((process.env.NODE_ENV === "production" && !isReview()) || process.env.DEMO_MODE !== "true")
  throw new Error("Seed is restricted to development with DEMO_MODE=true.");
for (const key of ["DEMO_CLIENT_PASSWORD", "DEMO_ADMIN_PASSWORD"])
  if (!process.env[key] || process.env[key]!.length < 12)
    throw new Error(`${key} must be configured in ignored .env.`);
for (const data of [
  {
    id: "demo-client",
    name: "İsim Soyisim (demo danışan)",
    email: "danisan@example.test",
    role: "CLIENT" as const,
    password: process.env.DEMO_CLIENT_PASSWORD!,
  },
  {
    id: "demo-admin",
    name: "Uzman (demo yönetici)",
    email: "uzman@example.test",
    role: "ADMIN" as const,
    password: process.env.DEMO_ADMIN_PASSWORD!,
  },
]) {
  const user = await db.user.upsert({
    where: { id: data.id },
    create: {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      emailVerified: true,
      adultConfirmed: true,
    },
    update: {},
  });
  if (!(await db.account.findFirst({ where: { userId: user.id, providerId: "credential" } })))
    await db.account.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: await hashPassword(data.password),
      },
    });
  await db.clientProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });
  await db.notificationPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });
}
await db.psychologistProfile.upsert({
  where: { id: "primary" },
  create: {
    id: "primary",
    biography: "Hakkımda",
  },
  update: {},
});
await db.siteSettings.upsert({ where: { id: "primary" }, create: { id: "primary" }, update: {} });
const services = [
  {
    id: "individual",
    name: "Bireysel görüşme",
    description:
      "Kendinizi ve yaşadıklarınızı konuşmak için ayrılmış bir zaman. Hizmet kapsamı uzman yetkileri doğrultusunda belirlenecektir.",
    durationMinutes: 50,
    priceKurus: 120000,
    paymentRequired: true,
    order: 0,
  },
  {
    id: "introduction",
    name: "Tanışma görüşmesi",
    description:
      "Süreçle ilgili sorularınızı sormak, ihtiyaçlarınızı paylaşmak ve görüşme koşulları hakkında bilgi almak için kısa bir başlangıç.",
    durationMinutes: 30,
    priceKurus: 0,
    paymentRequired: false,
    order: 1,
  },
  {
    id: "followup",
    name: "Devam görüşmesi",
    description:
      "Uzmanınızla belirlenen görüşme planı kapsamında devam eden randevularınız için. Uygunluğu birlikte değerlendirilir.",
    durationMinutes: 50,
    priceKurus: 120000,
    paymentRequired: true,
    order: 2,
  },
];
for (const service of services)
  await db.service.upsert({ where: { id: service.id }, create: service, update: {} });
for (let day = 1; day <= 6; day++)
  for (const range of [
    { startMinute: 540, endMinute: 720 },
    { startMinute: 780, endMinute: 1080 },
  ])
    await db.availabilityRule.upsert({
      where: { id: `hours-${day}-${range.startMinute}` },
      create: { id: `hours-${day}-${range.startMinute}`, dayOfWeek: day, ...range },
      update: {},
    });
const faqs = [
  [
    "İlk görüşme öncesinde ne yapmalıyım?",
    "Hesabınızı oluşturup e-posta adresinizi doğrulayın. Uygun bir saat seçerek talebinizi iletin. Görüşme öncesinde sessiz bir alan ve cihaz kontrolü için zaman ayırabilirsiniz.",
  ],
  [
    "Randevu talebi gönderince randevum kesinleşir mi?",
    "Talebiniz önce uzman tarafından değerlendirilir. Onay ve gerekiyorsa ödeme adımı tamamlandığında randevunuz kesinleşir. Durumu hesabınızdan takip edebilirsiniz.",
  ],
  [
    "Online görüşmeler kaydediliyor mu?",
    "Hayır. Varsayılan olarak ses veya görüntü kaydı yapılmaz. Geliştirme odası, gerçek bir görüntülü görüşme hizmeti değildir.",
  ],
  [
    "Randevumu değiştirebilir veya iptal edebilir miyim?",
    "Randevunuza kaydedilen iptal süresi içinde hesabınızdan işlem yapabilirsiniz. Varsayılan süre 24 saattir. Süre dolduğunda destek formundan iletişime geçebilirsiniz.",
  ],
  [
    "Değerlendirmelerim herkese açık mı?",
    "Hayır. Görüşme sonrası değerlendirme isteğe bağlıdır ve yalnızca siz ve yetkili yönetici tarafından görüntülenebilir. Yorumlar ve puanlar kamuya açık yayımlanmaz.",
  ],
  [
    "Bu platformu acil destek için kullanabilir miyim?",
    "Bu platform acil müdahale hizmeti sunmaz. Acil tehlike durumunda 112 Acil Çağrı Merkezi ile iletişime geçin.",
  ],
];
for (const [i, [question, answer]] of faqs.entries())
  await db.fAQ.upsert({
    where: { id: `faq-${i}` },
    create: { id: `faq-${i}`, question, answer, published: true, order: i },
    update: {},
  });
const category = await db.blogCategory.upsert({
  where: { name: "Platform rehberi" },
  create: { name: "Platform rehberi" },
  update: {},
});
const posts = [
  {
    slug: "ilk-randevuya-hazirlik",
    title: "İlk randevunuza hazırlanırken",
    excerpt: "Randevu sürecini tanımak ve küçük teknik hazırlıklar için bir başlangıç rehberi.",
    content:
      "İlk randevunuzu oluştururken görüşme türünü, süreyi ve size sunulan saatleri inceleyebilirsiniz. Talebinizin ardından uzman yanıtını hesabınızdan takip edebilirsiniz.\n\nRandevu kesinleştiğinde tarih ve saati takviminize ekleyebilirsiniz. Görüşme için sessiz, özel ve bölünmeyeceğiniz bir alan seçin. Kamera ve mikrofon izinlerini kontrol etmek için birkaç dakika ayırın.\n\nSüreçle ilgili sorularınız varsa destek alanını kullanın. Burada sağlık bilgisi veya görüşme içeriği paylaşmayın. Bu yazı yalnızca platform kullanımını açıklar; kişiye özel mesleki öneri sunmaz.",
  },
  {
    slug: "online-gorusme-teknik-hazirlik",
    title: "Online görüşme için küçük hazırlıklar",
    excerpt: "Kamera, mikrofon ve bağlantı kontrolü için pratik platform bilgileri.",
    content:
      "Güncel bir tarayıcı ve kararlı internet bağlantısı kullanın. Cihazınızın şarjını, kamera ve mikrofon izinlerini kontrol edin. Kulaklık kullanmak ortam seslerini azaltabilir.\n\nHesabınızın online görüşme alanından cihaz testi yapabilirsiniz. Kamera görüntüsü yalnızca kendi tarayıcınızda gösterilir. Geliştirme odası başka bir katılımcıya görüntü iletmez.\n\nCanlı hizmet yapılandırıldığında görüşme saati yaklaştığında odanıza erişebilirsiniz. Teknik sorunlar için destek formundan başvurun.",
  },
  {
    slug: "hesabiniz-ve-gizlilik",
    title: "Hesabınızda gizliliğinizi yönetmek",
    excerpt: "Bildirim tercihleri, özel değerlendirmeler ve kişisel veri talepleriniz hakkında.",
    content:
      "Hesap ayarları alanında iletişim bilgilerinizi ve bildirim tercihlerinizi yönetebilirsiniz. E-posta bildirimlerini ve hatırlatmaları ayrı ayrı seçebilirsiniz.\n\nGörüşme sonrası değerlendirmeler isteğe bağlı ve özeldir. Herkese açık yorum veya puan yayımlanmaz.\n\nVeri talebi bölümünden erişim, düzeltme veya silme başvurusu oluşturabilirsiniz. Veri dışa aktarımı yalnızca kendi hesabınız için hazırlanır. Silme talepleri yasal saklama yükümlülükleri bakımından ayrıca değerlendirilir.",
  },
];
for (const [i, post] of posts.entries())
  await db.blogPost.upsert({
    where: { slug: post.slug },
    create: {
      ...post,
      categoryId: category.id,
      published: true,
      reviewed: true,
      publishedAt: new Date(Date.now() - i * 86400_000),
    },
    update: {},
  });
await db.certificate.upsert({
  where: { id: "placeholder-certificate" },
  create: {
    id: "placeholder-certificate",
    title: "Sertifika Adı",
    institution: "Kurum Adı",
    description:
      "Bu bir yetkinlik belgesi değildir. Galerinin geliştirme amacıyla gösterilen yer tutucusudur.",
    published: true,
    redactionConfirmed: true,
    isPlaceholder: true,
  },
  update: {},
});
const now = new Date();
const seedAppointments = [
  {
    id: "demo-live",
    startsAt: new Date(now.getTime() - 5 * 60_000),
    status: "CONFIRMED" as const,
    paid: true,
  },
  {
    id: "demo-upcoming",
    startsAt: istanbulDate(addDays(localDate(), 2), 840),
    status: "CONFIRMED" as const,
    paid: true,
  },
  {
    id: "demo-pending",
    startsAt: istanbulDate(addDays(localDate(), 3), 660),
    status: "PENDING_APPROVAL" as const,
    paid: false,
  },
  {
    id: "demo-completed",
    startsAt: istanbulDate(addDays(localDate(), -3), 600),
    status: "COMPLETED" as const,
    paid: true,
  },
];
for (const a of seedAppointments) {
  await db.appointment.upsert({
    where: { id: a.id },
    create: {
      id: a.id,
      clientId: "demo-client",
      serviceId: "individual",
      startsAt: a.startsAt,
      endsAt: new Date(a.startsAt.getTime() + 50 * 60_000),
      reservedUntil: new Date(a.startsAt.getTime() + 60 * 60_000),
      durationMinutes: 50,
      priceKurus: 120000,
      status: a.status,
      holdExpiresAt: a.status === "PENDING_APPROVAL" ? new Date(Date.now() + 48 * 3600_000) : null,
      payment: {
        create: {
          id: `pay-${a.id}`,
          amountKurus: 120000,
          status: a.paid ? "PAID" : "PENDING",
          provider: "mock",
          providerPaymentId: a.paid ? `seed-${a.id}` : null,
        },
      },
      history: {
        create: { toStatus: a.status, actorId: "demo-admin", reason: "Fictional development data" },
      },
    },
    update: {},
  });
}
await db.feedback.upsert({
  where: { appointmentId: "demo-completed" },
  create: {
    appointmentId: "demo-completed",
    overall: 4,
    communication: 4,
    booking: 5,
    technical: 4,
    comment: "Kurgusal test değerlendirmesi. Gerçek bir danışanın yorumu değildir.",
  },
  update: {},
});
for (const [kind, title, body] of [
  [
    "CONFIRMED",
    "Randevunuz kesinleşti",
    "Randevu ayrıntılarını hesabınızdan görüntüleyebilirsiniz.",
  ],
  [
    "PAYMENT",
    "Test ödemeniz alındı",
    "Geliştirme ödemesi tamamlandı. Gerçek bir ücret tahsil edilmedi.",
  ],
  [
    "WELCOME",
    "Hoş geldiniz",
    "Bu hesap ve randevular, geliştirme amacıyla hazırlanmış kurgusal verilerdir.",
  ],
])
  await db.notification.upsert({
    where: { dedupeKey: `seed-${kind}` },
    create: { userId: "demo-client", kind, title, body, dedupeKey: `seed-${kind}` },
    update: {},
  });
console.log(
  "Development seed complete. Demo email addresses: danisan@example.test / uzman@example.test. Use the unique passwords in your ignored .env file.",
);
await db.$disconnect();
