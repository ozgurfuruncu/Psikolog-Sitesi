export const appUrl = process.env.APP_URL || "http://localhost:3000";
export const isIsolatedTest = () => {
  if (process.env.ISOLATED_TEST_MODE !== "true") return false;
  try {
    return /^\/durak_e2e_[a-f0-9]{12}$/.test(new URL(process.env.DATABASE_URL || "").pathname);
  } catch {
    return false;
  }
};
export const isDemo = () =>
  process.env.DEMO_MODE === "true" && (process.env.NODE_ENV !== "production" || isIsolatedTest());
export function requireDemo() {
  if (!isDemo()) throw new Error("Geliştirme işlevi bu ortamda kapalı.");
}
export function productionGate() {
  if (
    process.env.NODE_ENV === "production" &&
    !isIsolatedTest() &&
    process.env.PRODUCTION_LEGAL_APPROVED !== "true"
  )
    throw new Error("Canlı hizmetler mesleki ve hukuki inceleme tamamlanana kadar kapalı.");
}
