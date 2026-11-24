import type { EntityConfig, Field } from "@/components/admin-editor";
export const serviceConfig: EntityConfig = {
  endpoint: "services",
  title: "Görüşme türleri",
  defaults: {
    name: "",
    description: "",
    durationMinutes: 50,
    priceKurus: 0,
    paymentRequired: false,
    active: true,
    order: 0,
  },
  fields: [
    { key: "name", label: "Hizmet adı", required: true },
    { key: "durationMinutes", label: "Süre (dakika)", type: "number", required: true },
    { key: "description", label: "Açıklama", type: "textarea", required: true },
    {
      key: "priceKurus",
      label: "Fiyat (kuruş)",
      type: "number",
      help: "Örn. 120000 kuruş = 1.200 TL",
    },
    { key: "order", label: "Görüntüleme sırası", type: "number" },
    {
      key: "paymentRequired",
      label: "Uzman onayından sonra online ödeme gerekli",
      type: "checkbox",
    },
    { key: "active", label: "Aktif hizmet", type: "checkbox" },
  ],
};
export const faqConfig: EntityConfig = {
  endpoint: "faqs",
  title: "Sıkça sorulan sorular",
  defaults: { question: "", answer: "", published: false, order: 0 },
  fields: [
    { key: "question", label: "Soru", required: true },
    { key: "order", label: "Görüntüleme sırası", type: "number" },
    { key: "answer", label: "Yanıt", type: "textarea", required: true },
    { key: "published", label: "Yayımla", type: "checkbox" },
  ],
};
export const certificateConfig: EntityConfig = {
  endpoint: "certificates",
  title: "Sertifikalar",
  defaults: {
    title: "",
    institution: "",
    completedAt: null,
    description: "",
    verificationUrl: "",
    published: false,
    redactionConfirmed: false,
    isPlaceholder: true,
    order: 0,
    fileId: null,
  },
  fields: [
    { key: "title", label: "Belge adı", required: true },
    { key: "institution", label: "Veren kurum", required: true },
    { key: "completedAt", label: "Tamamlanma tarihi", type: "date" },
    { key: "order", label: "Görüntüleme sırası", type: "number" },
    { key: "description", label: "Açıklama", type: "textarea" },
    {
      key: "verificationUrl",
      label: "Kurumun doğrulama bağlantısı (HTTPS)",
      help: "Bağlantı eklemek, bağımsız doğrulama yapıldığı anlamına gelmez.",
    },
    { key: "isPlaceholder", label: "Bu kayıt örnek / yer tutucudur", type: "checkbox" },
    {
      key: "redactionConfirmed",
      label: "Kişisel bilgileri maskeledim ve yayın iznini kontrol ettim",
      type: "checkbox",
    },
    { key: "published", label: "Yayımla", type: "checkbox" },
  ],
};
export const educationConfig: EntityConfig = {
  endpoint: "education",
  title: "Eğitim ve yetkinlikler",
  defaults: { institution: "", qualification: "", year: null, published: false, order: 0 },
  fields: [
    { key: "institution", label: "Kurum", required: true },
    { key: "qualification", label: "Eğitim / program adı", required: true },
    { key: "year", label: "Tamamlanma yılı", type: "number" },
    { key: "order", label: "Görüntüleme sırası", type: "number" },
    { key: "published", label: "Yayımla", type: "checkbox" },
  ],
};
export const announcementConfig: EntityConfig = {
  endpoint: "announcements",
  title: "Duyurular",
  defaults: { title: "", body: "", published: false },
  fields: [
    { key: "title", label: "Başlık", required: true },
    { key: "body", label: "Duyuru", type: "textarea", required: true },
    { key: "published", label: "Yayımla", type: "checkbox" },
  ],
};
export const availabilityConfig: EntityConfig = {
  endpoint: "availability",
  title: "Çalışma saatleri",
  defaults: { dayOfWeek: 1, startMinute: 540, endMinute: 1080, active: true, date: "" },
  fields: [
    {
      key: "dayOfWeek",
      label: "Haftanın günü",
      type: "number",
      help: "0: Pazar, 1: Pazartesi … 6: Cumartesi",
    },
    {
      key: "date",
      label: "Özel tarih (isteğe bağlı)",
      help: "YYYY-AA-GG; boş bırakılırsa her hafta tekrarlanır.",
    },
    { key: "startMinute", label: "Başlangıç saati", type: "minute" },
    { key: "endMinute", label: "Bitiş saati", type: "minute" },
    { key: "active", label: "Aktif", type: "checkbox" },
  ],
};
export const profileFields: Field[] = [
  { key: "name", label: "Ad soyad", required: true },
  {
    key: "title",
    label: "Mesleki unvan",
    help: "Yalnızca kullanmaya yetkili olduğunuz unvanı girin.",
  },
  { key: "biography", label: "Biyografi", type: "textarea" },
  { key: "experience", label: "Mesleki deneyim", type: "textarea" },
  { key: "areas", label: "Yetkili çalışma alanları", type: "textarea" },
  { key: "approaches", label: "Yaklaşımlar", type: "textarea" },
  { key: "languages", label: "Konuşulan diller" },
  { key: "contactEmail", label: "İletişim e-postası" },
  { key: "contactPhone", label: "İletişim telefonu" },
  {
    key: "isPlaceholder",
    label: "Profil bilgileri henüz tamamlanmadı / örnektir",
    type: "checkbox",
  },
];
export const siteContentConfig: EntityConfig = {
  endpoint: "site-content",
  title: "Site metinleri",
  defaults: { key: "home-note", title: "", body: "", published: false },
  fields: [
    {
      key: "key",
      label: "İçerik alanı",
      type: "select",
      options: [
        { value: "home-introduction", label: "Ana sayfa giriş başlığı ve açıklaması" },
        { value: "home-note", label: "Ana sayfa bilgi notu" },
        { value: "contact-info", label: "İletişim sayfası açıklaması" },
      ],
    },
    { key: "title", label: "Başlık", required: true },
    { key: "body", label: "Açıklama", type: "textarea" },
    { key: "published", label: "Yayımla", type: "checkbox" },
  ],
};
export const settingsFields: Field[] = [
  {
    key: "reminderHours",
    label: "Hatırlatma saatleri",
    help: "Virgülle ayırın. Örn. 24,1 · En çok dört değer, 1–168 saat.",
  },
  { key: "siteName", label: "Site adı", required: true },
  { key: "bookingNoticeHours", label: "Minimum randevu bildirimi (saat)", type: "number" },
  { key: "cancellationHours", label: "İptal / değişiklik sınırı (saat)", type: "number" },
  { key: "bufferMinutes", label: "Görüşme arası boşluk (dakika)", type: "number" },
  { key: "holdHours", label: "Talep rezervasyonu (saat)", type: "number" },
  { key: "paymentHoldHours", label: "Ödeme bekleme süresi (saat)", type: "number" },
  { key: "cancellationText", label: "İptal politikası açıklaması", type: "textarea" },
];
