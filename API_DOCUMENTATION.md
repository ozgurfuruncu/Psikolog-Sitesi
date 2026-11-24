# API documentation

All application writes validate JSON/multipart on the server. Session cookies are required except for public availability, support, authentication, provider callbacks and authenticated job execution. Application mutation requests must include `Origin` matching `APP_URL`. Sensitive responses use `Cache-Control: no-store`. HTTP errors use `{ "error": "Turkish user-facing message" }`; Better Auth uses its own `{code,message}` shape.

| Status | Meaning |
| --- | --- |
| 400 / 422 | Invalid input or disallowed business operation |
| 401 | No session / invalid webhook signature |
| 403 | Wrong role, CSRF origin, inaccessible room or file |
| 404 | Missing resource, including another client's resource |
| 409 | Status conflict, occupied slot or unique constraint |
| 429 | Rate limit exceeded |
| 500 / 502 / 503 | Internal failure / provider failure / unconfigured service |

## Authentication

`/api/auth/*` is handled by Better Auth. Email/password endpoints include:

- `POST /api/auth/sign-up/email`: `{name,email,password,adultConfirmed:true,termsAccepted:true,callbackURL}`. Password length 12–128. Role input is ignored; adults only. The public handler enforces the checkbox declarations.
- `POST /api/auth/sign-in/email`: `{email,password}`. Verified email required.
- `POST /api/auth/sign-out`: revokes database session.
- `GET /api/auth/get-session`: current session or null.
- `GET /api/auth/verify-email?token=...&callbackURL=...`.
- `POST /api/auth/request-password-reset`: `{email,redirectTo}`. Generic response prevents simple account enumeration.
- `POST /api/auth/reset-password`: `{token,newPassword}`. Single use; revokes previous sessions.

## Public reads and support

- `GET /api/services`: active service records.
- `GET /api/availability?serviceId=...&date=YYYY-MM-DD`: available `{startsAt,endsAt}` UTC ISO strings; no identities or booked appointment details.
- `POST /api/support`: `{name,email,subject,message}`. Global rate limit; operational requests only.

## Client-owned resources

- `GET /api/me`: minimal current user.
- `GET /api/appointments`: own records (admin sees authorized practice records).
- `GET /api/appointments/:id`: owned details including status history.
- `POST /api/appointments`: `{serviceId,startsAt,consent:true,privacy:true}`. Server snapshots authoritative price, duration, policy and document versions.
- `POST /api/appointments/:id`: `{action,startsAt?}`. Actions: `approve`, `reject`, `propose`, `accept`, `decline`, `cancel`, `start`, `complete`, `no-show`. Role/state rules are checked by the domain service. `startsAt` is required for `propose`.
- `POST /api/appointments/:id/feedback`: `{overall,communication,booking,technical,comment?}`. Scores 1–5; client owner only; completed appointment; one submission.
- `GET /api/appointments/:id/ics`: confirmed/in-progress only. Private, neutral calendar summary.
- `POST /api/appointments/:id/video`: `{}` returns `{roomId,token,expiresAt,developmentOnly}`; development provider only.
- `POST /api/appointments/:id/video-check`: `{token}` revalidates user, room, expiry, state and access window.
- `GET /api/notifications`; `POST /api/notifications` marks all own items read; `POST /api/notifications/:id` marks one.
- `GET /api/profile`; `POST /api/profile`: `{name,phone,emailNotifications,reminders,feedbackInvitation}`.
- `GET /api/data-export`: downloadable own-record JSON, excluding password/session/provider credentials.
- `POST /api/data-requests`: `{type:"ACCESS"|"CORRECTION"|"DELETION",details?}`.
- `POST /api/waitlist`: `{date}`; unique per user/date; cancellation/expiry notifications reveal no identity.

## Payments

- `POST /api/payments/:id/checkout`: own approved payable appointment; optional `{identityNumber,address,city}` required by the iyzico sandbox adapter. These fields are passed to the provider and not stored as user profile data. The browser includes mock checkout and a sandbox-only test buyer form for iyzico. The complete merchant integration still needs provider verification.
- `POST /api/payments/:id/mock`: development-only `{outcome:"PAID"|"FAILED"}`. Uses the persisted amount/currency and an internally signed event; cannot run in production.
- `POST /api/payments/mock-webhook`: raw JSON `{eventId,paymentId,amountKurus,currency:"TRY",status:"PAID"|"FAILED",providerPaymentId}`, signed with `X-Mock-Signature = HMAC-SHA256(rawBody, MOCK_WEBHOOK_SECRET)`.
- `POST /api/payments/iyzico/callback`: Checkout Form token; server retrieves and validates signed provider state before confirmation. A redirect alone never pays an appointment.
- `POST /api/payments/iyzico/webhook`: HPP-format V3 signature validation, followed by authoritative token retrieval. Only sandbox URL is permitted.
- `POST /api/payments/:id/refund`: own cancelled paid appointment; pending/refunded operations are idempotent. Cancellation normally creates the request automatically.

## Administration

All `/api/admin/*` routes require the persisted `ADMIN` role. Reads mainly use authorized server pages; `GET /api/admin/clients` returns a bounded authorized list.

Create/update JSON endpoints (include `id` for update): `services`, `profile`, `education`, `certificates`, `blog`, `faqs`, `announcements`, `site-content`, `availability`, `settings`. The forms expose matching field validation. `categories` creates blog categories. `blocks` creates a blocked interval and rejects overlap with an active appointment.

`DELETE /api/admin/:entity` accepts `{id}` for services, blog, FAQ, education, certificates, announcements, availability and blocks. Services are deactivated. There are no delete endpoints for financial/appointment/consent/audit records.

- `POST /api/admin/profile-photo`: `{fileId}`; existing JPEG/PNG only.
- `POST /api/admin/refunds`: `{id}`; completes development mock refund only.
- `POST /api/admin/data-requests`: `{id,status:"REVIEWING"|"RESOLVED"|"REJECTED",resolution}`; does not automatically delete personal data.
- `POST /api/admin/support`: `{id,status:"OPEN"|"CLOSED"}`.
- `POST /api/admin/run-jobs`: runs the same durable job cycle as the worker.

## Files and jobs

- `POST /api/files`: admin-only multipart field `file`; maximum 5 MB; PDF, PNG or JPEG with matching signature; PDF active-content markers rejected. Random private storage key; returns `{id,url}`. Redaction is a pre-upload responsibility, acknowledged before publication.
- `GET /api/files/:id?expires=...&signature=...`: admin session or valid short-lived URL for currently published authorized content. Unpublished files cannot be made public by retaining an old URL.
- `GET /api/dev/mailbox`: administrator + development mode only.
- `POST /api/jobs`: `Authorization: Bearer JOB_SECRET`; protected scheduler endpoint, no browser session required.

Lists are currently bounded rather than fully paginated. Do not use the API as an unauthenticated public integration surface for sensitive data.
