const origin = new URL(process.env.APP_URL || "");
if (origin.protocol !== "https:" || !process.env.JOB_SECRET || process.env.JOB_SECRET.length < 32)
  throw new Error("Configure an HTTPS APP_URL and JOB_SECRET for the scheduler.");
const response = await fetch(new URL("/api/jobs", origin), {
  method: "POST",
  headers: { authorization: `Bearer ${process.env.JOB_SECRET}` },
  redirect: "error",
  signal: AbortSignal.timeout(50000),
});
if (!response.ok) {
  console.error(JSON.stringify({ event: "scheduled_jobs_failed", status: response.status }));
  process.exit(1);
}
console.log(JSON.stringify({ event: "scheduled_jobs_completed", status: response.status }));
