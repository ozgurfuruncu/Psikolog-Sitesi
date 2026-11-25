export const appUrl = process.env.APP_URL || "http://localhost:3000";
export const developmentOrigins =
  process.env.NODE_ENV === "development"
    ? (process.env.DEV_LAN_ORIGINS || "").split(",").filter(Boolean)
    : [];
export const trustedAppOrigins = [...new Set([new URL(appUrl).origin, ...developmentOrigins])];
export const isIsolatedTest = () => {
  if (process.env.ISOLATED_TEST_MODE !== "true") return false;
  try {
    return /^\/durak_e2e_[a-f0-9]{12}$/.test(new URL(process.env.DATABASE_URL || "").pathname);
  } catch {
    return false;
  }
};
// Public reviews use their own database and simulated providers. A flag alone must
// never turn an ordinary production database into a demo environment.
export const isReview = () => {
  if (
    process.env.REVIEW_MODE !== "true" ||
    process.env.DEMO_MODE !== "true" ||
    process.env.PAYMENT_PROVIDER !== "mock" ||
    process.env.VIDEO_PROVIDER !== "mock" ||
    process.env.EMAIL_PROVIDER !== "preview" ||
    process.env.FILE_STORAGE_PROVIDER !== "database" ||
    process.env.PRODUCTION_LEGAL_APPROVED !== "false" ||
    process.env.ISOLATED_TEST_MODE ||
    process.env.IYZICO_API_KEY ||
    process.env.IYZICO_SECRET_KEY
  )
    return false;
  try {
    return /^\/durak_review_[a-f0-9]{12}$/.test(new URL(process.env.DATABASE_URL || "").pathname);
  } catch {
    return false;
  }
};
export const isDemo = () =>
  process.env.DEMO_MODE === "true" &&
  (process.env.NODE_ENV !== "production" || isIsolatedTest() || isReview());
export function requireDemo() {
  if (!isDemo()) throw new Error("Geliştirme işlevi bu ortamda kapalı.");
}
export function productionGate() {
  if (
    process.env.NODE_ENV === "production" &&
    !isIsolatedTest() &&
    !isReview() &&
    process.env.PRODUCTION_LEGAL_APPROVED !== "true"
  )
    throw new Error("Canlı hizmetler mesleki ve hukuki inceleme tamamlanana kadar kapalı.");
}
