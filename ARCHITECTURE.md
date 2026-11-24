# Architecture

## Application boundary

The system serves one practitioner. A singleton professional profile and site settings record represent that practice. Users have `CLIENT` or `ADMIN` roles; there is no marketplace or public administrator signup. Database access belongs to server modules. Browser components receive serialized authorized data and issue JSON/multipart requests with same-origin checks.

The App Router's server pages read persisted records. Layout and per-resource guards independently enforce authentication and ownership. Better Auth owns credential hashing, verification, reset tokens and database sessions. The browser does not receive database or provider secrets. API writes use Zod. Plain-text content renders through React escaping; no user HTML is injected.

## Dependency decisions

- Next.js 16.4.6 / React 19.3.1 on Node.js 24.19.0 were installed from the registry and checked with the bundled Next.js guides. Async route params and request headers follow the installed framework conventions.
- Prisma 7.10.1 explicitly stays on major 7 because the Better Auth Prisma adapter documentation identifies Prisma 8 compatibility limits. `@prisma/adapter-pg` supplies the required driver adapter.
- Better Auth 1.7.27 provides maintained email/password flows, verification, password reset, CSRF/origin defenses, sessions and database-backed rate limiting.
- Tailwind 4 plus local shadcn-style primitives uses CVA, clsx, tailwind-merge and Radix Dialog. Components are owned in `src/components/ui.tsx`; no generator runtime is needed.
- The custom calendar supports day/week/month without dragging appointments into unvalidated states. Every change uses the appointment domain service.
- `effect` is overridden to the compatible patched 3.22.x line to eliminate a Prisma CLI transitive ReDoS advisory. Nodemailer was upgraded to 10.6.1 after the first dependency audit. Lockfile and test results are authoritative.
- Embedded PostgreSQL 17 is a development-only fallback because Docker Desktop's daemon was unavailable in this environment. The production schema is ordinary PostgreSQL and runs unchanged with Docker or an independent server.

## Appointment transaction

`createAppointment` and all status mutations acquire the same PostgreSQL transaction advisory lock before querying calendar state. The transaction releases expired holds, loads authoritative settings/service values, validates future notice, 30-minute grid, work intervals, breaks and blocked times, then stores the duration, price, currency and cancellation deadline snapshot. State history, notifications, email outbox and audit records are written inside the transaction.

A partial GiST exclusion constraint additionally forbids overlapping `tsrange(startsAt, reservedUntil, '[)')` values for active states. It also protects against writes that bypass the TypeScript layer. No extension is needed for a single-practitioner range-only calendar. Adding multiple practitioners would require a practitioner FK and an appropriate composite exclusion constraint.

Approvals lead to `AWAITING_PAYMENT` or `CONFIRMED`. An administrator's alternative reserves the new range until accepted, declined or expired. A client rescheduling request also reserves the new range and re-enters approval; the former time is released. Rejecting an alternative cancels that request. Cancellation of a paid appointment creates `REFUND_PENDING` independently from appointment state. Completed/closed appointments cannot receive new room credentials.

UTC timestamps are persisted. Europe/Istanbul is the fixed initial display/calendar zone; the implementation's +03:00 conversion deliberately serves modern Turkish scheduling and is not a general historical timezone engine. Future English localization can reuse the isolated locale/status/formatting module; full translation dictionaries are not implemented.

## Provider boundaries

- `PaymentProvider` has development mock and iyzico sandbox implementations. Only verified server events can confirm payment. Amount/currency, appointment state, webhook signature and duplicate event checks are authoritative. Checkout Form retrieval validates the signed provider response. Secrets never reach browser code. Live iyzico endpoints are rejected.
- `VideoProvider` returns a unique room, user-bound HMAC credential and five-minute expiry. Issuance and heartbeat checks verify participant ownership, status, room closure and the -10/+15 minute access window. The mock has local device preview and simulated access, **no media transport**. A production provider still needs implementation after review.
- Notification writes use an in-app table and durable email outbox. The worker claims jobs with `FOR UPDATE SKIP LOCKED`, recovers abandoned claims, retries exponentially, and tracks delivery/preview/failure. Unique dedupe keys prevent repeated reminders. Continuous scheduler execution is operationally required.

## Files and content

Certificates live outside the public directory under random storage keys. The API checks role, size, permitted MIME and signature bytes and rejects common PDF active-content markers. Publication requires a redaction acknowledgement. Short-lived links are granted only for currently published/redaction-confirmed certificates or authorized public profile/blog images. This is not antivirus/CDR; production needs a scanning pipeline.

Services are deactivated rather than deleted because historical appointments retain foreign keys. Blog publication requires an explicit review flag. The review flag is the administrator's attestation, not an independent verification process. There are no clinical records or public testimonials.

## Limits

The process-local filesystem is suitable for a single local deployment; clustered production needs a private object store and coordinated lifecycle policies. No production video provider, real refund API, two-factor auth, Google Calendar OAuth, complete English UI, or legal compliance certification is included. API routing is centralized for compactness and can be split by domain as the application grows. Client lists are bounded (not fully paginated). Existing cancellation snapshots do not change when global policy is edited.

## Primary documentation consulted

- https://nextjs.org/docs/app/getting-started/installation
- Installed `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- Installed `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`
- https://www.prisma.io/docs/orm/v7
- https://better-auth.com/docs/adapters/prisma
- https://better-auth.com/docs/authentication/email-password
- https://docs.iyzico.com/en/payment-methods/checkoutform/cf-implementation
- https://docs.iyzico.com/en/advanced/webhook
- https://docs.iyzico.com/en/advanced/response-signature-validation
- https://github.com/leinelissen/embedded-postgres
