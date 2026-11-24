export const locale = "tr-TR";
export const timezone = "Europe/Istanbul";
export const statusLabels: Record<string, string> = {
  PENDING_APPROVAL: "Onay bekliyor",
  ALTERNATIVE_PROPOSED: "Yeni saat önerildi",
  AWAITING_PAYMENT: "Ödeme bekliyor",
  CONFIRMED: "Onaylandı",
  IN_PROGRESS: "Görüşme sürüyor",
  COMPLETED: "Tamamlandı",
  REJECTED: "Talep reddedildi",
  CANCELLED: "İptal edildi",
  EXPIRED: "Süresi doldu",
  NO_SHOW: "Katılım olmadı",
  NOT_REQUIRED: "Ödeme gerekmiyor",
  PENDING: "Bekliyor",
  PAID: "Ödendi",
  FAILED: "Başarısız",
  REFUND_PENDING: "İade bekleniyor",
  REFUNDED: "İade edildi",
};
export function formatDate(
  value: Date | string,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" },
) {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: timezone }).format(
    new Date(value),
  );
}
export const formatTime = (value: Date | string) =>
  formatDate(value, { hour: "2-digit", minute: "2-digit" });
export const money = (kurus: number) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(kurus / 100);
export function localDate(value: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}
export function istanbulDate(date: string, minute: number) {
  return new Date(
    `${date}T${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}:00+03:00`,
  );
}
export function addDays(date: string, days: number) {
  return localDate(new Date(new Date(date + "T12:00:00+03:00").getTime() + days * 86400_000));
}
