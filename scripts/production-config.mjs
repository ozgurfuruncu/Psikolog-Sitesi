import { isAbsolute } from "node:path";

export function validateProduction(env) {
  const errors = [];
  let origin;
  try {
    const url = new URL(env.APP_URL || "");
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      /^(localhost|127\.|0\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\])/.test(url.hostname)
    )
      throw new Error();
    origin = url.origin;
  } catch {
    errors.push("APP_URL must be a public HTTPS origin.");
  }
  if (env.BETTER_AUTH_URL && env.BETTER_AUTH_URL !== origin)
    errors.push("BETTER_AUTH_URL must equal APP_URL.");
  for (const key of ["BETTER_AUTH_SECRET", "JOB_SECRET", "SETUP_TOKEN"])
    if (!env[key] || env[key].length < 32)
      errors.push(`${key} must contain at least 32 random characters.`);
  const review = env.REVIEW_MODE === "true";
  if (env.ISOLATED_TEST_MODE || env.DEV_LAN_ORIGINS || (!review && env.DEMO_MODE !== "false"))
    errors.push("Production must disable demo and isolated/LAN preview settings.");
  if (!review && (env.PAYMENT_PROVIDER !== "disabled" || env.VIDEO_PROVIDER !== "disabled"))
    errors.push("Public staging requires PAYMENT_PROVIDER=disabled and VIDEO_PROVIDER=disabled.");
  try {
    const url = new URL(env.DATABASE_URL || "");
    if (
      !/^postgres(ql)?:$/.test(url.protocol) ||
      /^(localhost|127\.|0\.|\[::1\])/.test(url.hostname) ||
      /durak_(test|e2e)_/.test(url.pathname)
    )
      throw new Error();
  } catch {
    errors.push("DATABASE_URL must identify a persistent cloud PostgreSQL database.");
  }
  if (review) {
    let isolated = false;
    try {
      isolated = /^\/durak_review_[a-f0-9]{12}$/.test(new URL(env.DATABASE_URL).pathname);
    } catch {}
    if (!isolated || env.DEMO_MODE !== "true" || env.PRODUCTION_LEGAL_APPROVED !== "false")
      errors.push(
        "Review requires a separate durak_review_<12 hex> database, DEMO_MODE=true and PRODUCTION_LEGAL_APPROVED=false.",
      );
    if (
      env.PAYMENT_PROVIDER !== "mock" ||
      env.VIDEO_PROVIDER !== "mock" ||
      env.IYZICO_API_KEY ||
      env.IYZICO_SECRET_KEY
    )
      errors.push("Review permits only mock payment/video providers and no merchant credentials.");
    if (env.EMAIL_PROVIDER !== "preview" || env.FILE_STORAGE_PROVIDER !== "database")
      errors.push("Review requires admin-only preview mail and persistent database file storage.");
    for (const key of ["MOCK_WEBHOOK_SECRET", "DEMO_CLIENT_PASSWORD", "DEMO_ADMIN_PASSWORD"])
      if (!env[key] || env[key].length < 32)
        errors.push(`${key} must contain at least 32 random characters for public review.`);
    return errors;
  }
  try {
    if (/^\/durak_review_/.test(new URL(env.DATABASE_URL).pathname))
      errors.push("Review databases cannot be used for a clinical production deployment.");
  } catch {
    /* The invalid URL is already reported above. */
  }
  if (
    !env.PRIVATE_STORAGE_PATH ||
    !isAbsolute(env.PRIVATE_STORAGE_PATH) ||
    env.PERSISTENT_STORAGE_CONFIRMED !== "true"
  )
    errors.push("Configure an absolute PRIVATE_STORAGE_PATH on a confirmed persistent volume.");
  if (
    env.EMAIL_PROVIDER !== "smtp" ||
    !env.SMTP_HOST ||
    !env.EMAIL_FROM ||
    !env.SMTP_USER ||
    !env.SMTP_PASSWORD
  )
    errors.push("Configure verified SMTP delivery (host, sender and credentials).");
  if (!["465", "587"].includes(env.SMTP_PORT || ""))
    errors.push("SMTP_PORT must be 465 or 587 with TLS.");
  return errors;
}
