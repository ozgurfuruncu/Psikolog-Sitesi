import { randomUUID } from "node:crypto";

export async function reportServerError(error: unknown, source = "request") {
  const event = {
    event: "server_error",
    id: randomUUID(),
    source,
    // Deliberately omit messages, request paths, bodies, headers, users and stack traces.
    type: error instanceof TypeError ? "TypeError" : error instanceof Error ? "Error" : "Unknown",
    time: new Date().toISOString(),
  };
  console.error(JSON.stringify(event));
  const destination = process.env.ERROR_MONITORING_WEBHOOK_URL;
  if (destination?.startsWith("https://")) {
    try {
      await fetch(destination, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(3000),
        redirect: "error",
      });
    } catch {
      console.error(JSON.stringify({ event: "error_monitoring_delivery_failed", id: event.id }));
    }
  }
  return event.id;
}
