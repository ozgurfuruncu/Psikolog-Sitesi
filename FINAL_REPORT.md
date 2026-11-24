# Delivery report

The requested platform has been implemented as a local full-stack development application. Its essential appointment workflow is verified end to end with real PostgreSQL persistence and server authorization. It is **not production-ready**, and unavailable external integrations are not represented as real consultations or charges.

## Verification categories

| Status | Capabilities |
| --- | --- |
| Fully implemented and verified locally | Public routes and profile placeholders, client registration/verification/login/logout/reset, adult and role guards, protected dashboards, transactional slots/holds, double-booking prevention including concurrent requests and SQL constraints, approval/rejection/alternatives/rescheduling/cancellation, private resource ownership, persisted payment state transitions, room authorization, private feedback, notifications/outbox/reminders, ICS export, owned data export, data-request/support submission, tested service/certificate/website-content operations, calendar views and responsive client layout. |
| Implemented but not externally verified | iyzico sandbox Checkout Form initialization/retrieval/V3 webhook adapter and sandbox buyer form; SMTP delivery adapter; all remaining administrator CRUD field combinations, optional custom-date combinations and deployment operations. |
| Development-only / mocked | Payment success/failure and refund completion, room access simulation and local device preview, email preview inbox, fictional accounts/appointments/prices/feedback/certificate. No card charge or participant-to-participant media occurs in the mock flow. |
| Blocked by external dependencies or review | Merchant eligibility/keys and provider verification, SMTP/DNS/processor configuration, actual practitioner identity/qualifications, permitted service/pricing/advertising model, remote-service authorization/provider selection, finalized legal/retention/transfer policies. |
| Not implemented | Production video transport, live payment/refund adapter, privileged MFA, Google Calendar OAuth synchronization, minors/guardian workflows, in-app document redaction, antivirus/CDR, automated legally approved data erasure/anonymization, full English translation, full large-list pagination and multi-instance private object storage. Clinical notes, diagnoses, recording and AI transcription were intentionally excluded as requested. |

## User-facing experience

All visible content is Turkish. Public pages cover the home, professional profile, education, certificates, services, online process, booking, blog/article, FAQ, contact, authentication and legal drafts. The refreshed visual identity combines fresh mint, sky blue and peach with soft lavender/sunlight accents and bright neutral surfaces. Client and administrator portals share the same palette, responsive navigation, accessible forms/dialogs, toast/error/success states, loading and empty states.

Clients select a service/date/time, review actual test pricing and cancellation hours, accept versioned draft notices, request approval and follow the status in their own account. The administrator approves or proposes a new time. Payment is requested only after approval where applicable. Confirmed appointments support neutral ICS export and a time-restricted development room. Completion unlocks one optional private evaluation. Operational statistics use database queries rather than hardcoded totals.

Administrators manage profile/education/certificates, services, blog/FAQ/announcements, selected website text slots, recurring/custom hours, breaks/blocked dates, appointments, clients, payments/refunds, private feedback, support/data requests and settings. The calendar has day/week/month views. Secrets are configured outside the browser; the dashboard reports provider status rather than exposing keys.

## Architecture and database

Next.js App Router / React / TypeScript; Tailwind and local Radix/shadcn-style components; Prisma 7 + PostgreSQL driver adapter; Better Auth; Zod; Lucide; Vitest; Playwright and axe. The project contains **35 Prisma models and three reproducible SQL migrations**, including native PostgreSQL interval exclusion and validation constraints. See [ARCHITECTURE.md](ARCHITECTURE.md), [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) and [ER source](docs/er-diagram.mmd).

Key directories: `src/app` routes/APIs, `src/components` views/forms, `src/lib` services/providers/security, `prisma` schema/migrations, `scripts` setup/seed/jobs, `tests` database/unit tests, `e2e` browser tests, `docs/screenshots` verification artifacts and `public/images` editorial assets. The repository uses branch `main`; its source repository is [ozgurfuruncu/Psikolog-Sitesi](https://github.com/ozgurfuruncu/Psikolog-Sitesi). Website hosting and deployment are separate operations.

## Installation and demo

```powershell
npm.cmd ci
node scripts/setup-env.mjs
npm.cmd run db:local
```

In another terminal:

```powershell
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev
```

Open http://localhost:3000. Run `npm.cmd run jobs` separately for reminders/mail delivery. If Docker Desktop is running, `docker compose up -d` is an alternative database/test-mail setup.

Demo client: `danisan@example.test`; demo administrator: `uzman@example.test`. Unique passwords are in the ignored local `.env` under `DEMO_CLIENT_PASSWORD` / `DEMO_ADMIN_PASSWORD`; they are not embedded in frontend code. New-account verification links are available only to the local administrator in `/yonetim/posta` when the preview provider is selected. `npm run demo:session` refreshes the fictional room for immediate local review without overlapping another active appointment.

See [README.md](README.md) for detailed setup and non-demo administrator provisioning. See [DEPLOYMENT.md](DEPLOYMENT.md) for scheduling, backup/recovery and release configuration.

## Actual checks and artifacts

- **36/36** unit/database tests passed.
- **10/10** real Chromium browser tests passed.
- Lint, TypeScript and production compilation passed.
- Dependency audit: **0 vulnerabilities**.
- Automated WCAG scan: zero detected A/AA violations on four representative pages.
- Nine desktop/mobile screenshots are linked in [TEST_REPORT.md](TEST_REPORT.md).

The full test report states scope, fixture time handling, resolved defects and unverified integrations. Browser/device and security coverage is bounded; passing tests is not a claim of universal accessibility or production security.

## Before real use

Complete [LEGAL_AND_PRIVACY_CHECKLIST.md](LEGAL_AND_PRIVACY_CHECKLIST.md), professional identity/authority verification, reviewed legal texts, provider configuration and [SECURITY.md](SECURITY.md) hardening. Add privileged MFA, independent security/accessibility review, private storage scanning, encrypted backups with a tested restore, payment reconciliation/refunds and an appropriate authorized video provider. Replace all fictional material and use a fresh production database. Review this application as a development deliverable before deciding on a separately authorized production release.
