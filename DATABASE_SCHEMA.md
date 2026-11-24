# Database schema

The source of truth is `prisma/schema.prisma`. Reproducible migrations include all enum/table/FK/index definitions and a second migration with invariants Prisma cannot express. The ER source is [docs/er-diagram.mmd](docs/er-diagram.mmd).

| Area | Models | Key relationships / invariants |
| --- | --- | --- |
| Identity | User, Session, Account, Verification, RateLimit | Unique email, unique session token; User → many sessions/accounts. Role cannot be set by public signup. |
| Profiles | ClientProfile, PsychologistProfile, Education, Certificate | Client profile one-to-one with User; singleton practitioner → many education/certificates. |
| Storage | PrivateFile | Random unique storage key; private disk path; certificate file reference unique. Content-file references are application validated rather than Prisma relations. |
| Services | Service | Appointment FK; inactive services retained. Positive paid prices and duration constraints. |
| Calendar | AvailabilityRule, BlockedTime, Appointment | UTC interval checks, workday/time constraints; partial range exclusion over active appointments including buffer. |
| State history | AppointmentStatusHistory, AlternativeAppointmentProposal | Many per appointment; previous and proposed ranges retained. |
| Money | Payment, PaymentEvent, Refund | One Payment per Appointment, separate statuses; integer kuruş, TRY only; unique event ID and provider identifiers. Multiple refund records supported. |
| Rooms / feedback | VideoSession, Feedback | Each is at most one per Appointment; unique room; four database-checked 1–5 scores. |
| Notifications | Notification, NotificationPreference, EmailDelivery | User-owned in-app records and one-to-one preferences; unique dedupe keys, retries, leases and delivery tracking. |
| Content | BlogPost, BlogCategory, FAQ, Announcement, SiteContent | Category FK, unique slug, independent draft/review flags and ordering. |
| Privacy | ConsentRecord, DataRequest | Versioned consent attached to user and optionally appointment; requests track review/result. |
| Operations | WaitlistEntry, SupportRequest, AuditLog, SiteSettings | User/date waitlist unique; minimal audit metadata; singleton settings. |

## Appointment statuses

`PENDING_APPROVAL`, `ALTERNATIVE_PROPOSED`, `AWAITING_PAYMENT`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `REJECTED`, `CANCELLED`, `EXPIRED`, `NO_SHOW`.

Payment statuses are independent: `NOT_REQUIRED`, `PENDING`, `PAID`, `FAILED`, `REFUND_PENDING`, `REFUNDED`.

## Temporal and price snapshots

`startsAt`, `endsAt`, and `reservedUntil` are PostgreSQL timestamps written as UTC by Prisma. `reservedUntil` includes the configured buffer. `holdExpiresAt` applies only to tentative states. Indexes support client/date listing, status/expiry jobs and calendar lookups. A background job expires tentative records, and every availability/booking/status transaction also expires holds while holding the calendar lock.

The appointment stores price, duration and cancellation hours at request time. Later service changes do not change existing charges or cancellation rules. Money is integer kuruş; frontend totals are never authoritative.

## History and deletion

The application exposes no route to delete appointments, payments, consents or audit history. Services are deactivated. Deleting a user with operational records is restricted through FKs; sessions and account-only preferences support cascade deletion. Audit actor references can be detached if an approved anonymization workflow requires it. The current UI records and reviews deletion requests, but does not automatically erase records or claim complete anonymization.

Before production, define legally approved retention periods per table and include backups, mail outbox, support messages, certificates, logs and provider copies. A reviewed erasure operation must revoke sessions, detach identifiers, minimize free text, preserve required financial evidence and retain only necessary audit facts. No universal retention duration is hardcoded because the correct periods depend on the authorized service and legal obligations.

## Migration commands

```text
npm run db:generate
npm run db:migrate
npm run db:seed
```

Use `prisma migrate dev --name <change>` for future development migrations. Preserve the custom exclusion/check constraints when generating migrations or restoring a database. Test restores with real PostgreSQL, not an in-memory imitation.
