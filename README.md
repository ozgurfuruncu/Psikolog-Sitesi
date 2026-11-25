# Durak — Online Psychology & Appointment Management

A Turkish-language, single-practitioner web application with a public website, client portal and administrator dashboard. The local appointment workflow uses real PostgreSQL persistence and server-side authorization. It is a development deliverable, **not a production-ready healthcare service**.

## Quick start on Windows

Requires Node.js 24 (tested: 24.19.0). Use `npm.cmd` / `npx.cmd` in PowerShell if script execution policy blocks npm.ps1. No paid credentials are needed.

```powershell
npm.cmd ci
node scripts/setup-env.mjs
npm.cmd run db:local
```

Keep the database terminal open. In a second terminal:

```powershell
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev
```

Open http://localhost:3000. Run the reliable notification/reminder worker in another terminal:

```powershell
npm.cmd run jobs
```

The Windows helper uses the workspace's DOS short path when bootstrapping PostgreSQL to avoid a native initdb encoding issue with non-ASCII user directories. It binds PostgreSQL to `127.0.0.1:5432`, stores data in `.local/postgres`, and never alters an existing cluster. On systems without short paths, use Docker or an independently installed PostgreSQL server.

### Telefondan yerel ağda açma

Veritabanı terminali açıkken, çalışan site terminalini Ctrl+C ile durdurun ve şunu çalıştırın:

```powershell
npm.cmd run dev:lan
```

Telefonu bilgisayarla aynı modemin Wi-Fi ağına bağlayın. Terminalde `Telefondan ac:` satırında yazan `http://192.168...:3000` adresini telefon tarayıcısında açın; telefonda `localhost` kullanmayın. Bilgisayar Ethernet kablosuyla aynı modeme bağlı olabilir. Komut yerel IP adresini her başlatmada yeniden bulur; gerekirse bağdaştırıcı seçmek için önce `$env:LAN_IP="192.168.1.5"` ayarlayın.

Bu komut sayfa dosyaları, oturum açma ve API kaynak kontrolleri için yalnızca seçilen ağ adresini ve bilgisayarın loopback adreslerini geliştirme ortamında kabul eder. `.env` dosyasını değiştirmez; üretim ortamının kaynak izinlerini genişletmez. Windows güvenlik duvarında Node.js erişiminin izinli olması gerekir. Misafir Wi-Fi/istemci izolasyonu cihazlar arası erişimi engelleyebilir. Bilgisayar ve iki terminal açık kalmalıdır; bu bir internet yayını değildir. Telefonda kamera/mikrofon için ayrıca güvenilir HTTPS gerekir.

## Docker database alternative

Start Docker Desktop, then run `docker compose up -d`. The Compose file provides PostgreSQL and an optional Mailpit test mailbox. Do not run both the embedded and Docker databases on the same port. Set `DATABASE_URL` in `.env` for your chosen database, then migrate and seed as above. Embedded PostgreSQL and Docker are development conveniences; use a managed, restricted PostgreSQL service for production.

## Demo access

| Role | Email | Password |
| --- | --- | --- |
| Client | `danisan@example.test` | `DEMO_CLIENT_PASSWORD` in your ignored local `.env` |
| Administrator | `uzman@example.test` | `DEMO_ADMIN_PASSWORD` in your ignored local `.env` |

`setup-env.mjs` generates unique secrets and demo passwords. Passwords are never printed, committed or returned by an API. Seeding requires `DEMO_MODE=true` and refuses ordinary production databases. The separately gated public review uses only a `durak_review_<12 hex>` database, preview mail and mock payment/video providers. Re-running the seed preserves existing records and passwords. Use `npm run demo:rotate-passwords` to rotate local demo passwords without logging them. All sample identities, appointments, prices, certificates and feedback are explicitly fictional.

To demonstrate a newly registered account, sign up, then use the demo administrator's **Geliştirme posta kutusu** at `/yonetim/posta` to open the verification email link. This inbox is administrator-only and unavailable in production. Alternatively configure SMTP/Mailpit. To refresh only the fictional current-time room for an immediate demo, run `npm run demo:session`; it refuses to overlap another active appointment.

## Main routes

Public: `/`, `/hakkinda`, `/egitim`, `/sertifikalar`, `/hizmetler`, `/randevu`, `/online-gorusme`, `/blog`, `/sikca-sorulan-sorular`, `/iletisim`, `/giris`, `/kayit`, `/sifremi-unuttum`, `/sifre-yenile` and the five legal draft pages.

Client: `/panel`, `/panel/randevular`, `/panel/gorusme`, `/panel/odemeler`, `/panel/degerlendirmeler`, `/panel/bildirimler`, `/panel/ayarlar`.

Administrator: `/yonetim`, `/yonetim/takvim`, `/yonetim/randevular`, `/yonetim/danisanlar`, `/yonetim/odemeler`, `/yonetim/degerlendirmeler`, `/yonetim/profil`, `/yonetim/icerik`, `/yonetim/uygunluk`, `/yonetim/destek`, `/yonetim/ayarlar`, development-only `/yonetim/posta`.

## Architecture and stack

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, accessible Radix dialog primitives with shadcn-style local components, Lucide, Prisma 7 with the PostgreSQL driver adapter, Better Auth, Zod 4, Vitest and Playwright. Versions are pinned by `package-lock.json`. A compact custom day/week/month calendar avoids a heavy calendar dependency. See [ARCHITECTURE.md](ARCHITECTURE.md).

```text
src/app/                 Public, authentication, client, admin and API routes
src/components/          Shared UI, forms, calendar, dashboard and room components
src/lib/                 Domain services, authorization, providers, jobs, validation
prisma/schema.prisma     Normalized PostgreSQL data model
prisma/migrations/       Reproducible DDL and database invariants
scripts/                 Local database, environment, seed, admin and worker scripts
tests/                   Unit and real PostgreSQL integration tests
e2e/                     Isolated Chromium browser tests
docs/screenshots/        Desktop and mobile verification artifacts
docs/er-diagram.mmd      Mermaid ER diagram
public/images/           Local editorial imagery; no invented professional portrait
```

## Configuration

Copy/reference `.env.example`; `setup-env.mjs` generates a ready-to-run local `.env`. Never commit it. Change `DATABASE_URL`, `APP_URL`, `BETTER_AUTH_URL`, and secrets per environment. `BETTER_AUTH_SECRET` must be at least 32 random characters. `DEMO_MODE` is effective only in development, an explicitly isolated disposable E2E database, or the isolated public review defined in `render.yaml`.

- Email: default `EMAIL_PROVIDER=preview`. Use `EMAIL_PROVIDER=smtp` with `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, optional credentials and `EMAIL_FROM`. For Mailpit: localhost:1025, secure=false; mailbox at http://localhost:8025. The worker claims outbox rows, retries up to five times and tracks delivery status. SMTP delivery is at-least-once; a provider may redeliver after an interrupted acknowledgement.
- Payments: default `PAYMENT_PROVIDER=mock`, development only. The server simulates success/failure through signed events and persisted amount checks. `PAYMENT_PROVIDER=iyzico` selects the implemented **sandbox-only** hosted Checkout Form adapter. Supply sandbox keys and required test buyer information to the API. Hosted checkout/retrieve/webhook paths exist; merchant-dependent behavior is not live-tested. The client UI includes a clearly labeled sandbox test buyer form; use only provider-issued test identity/address data. Merchant-specific requirements still require verification before activation. No card information is collected or stored.
- Video: `VIDEO_PROVIDER=mock` issues short-lived, user-bound room access inside the appointment window. Camera/microphone preview is local only. No media is sent to another participant. Production video is intentionally unavailable pending legal/provider review.
- Scheduling: run `npm run jobs` continuously or call `POST /api/jobs` from an authenticated scheduler using `Authorization: Bearer JOB_SECRET`. See [DEPLOYMENT.md](DEPLOYMENT.md).

## Administrator provisioning

For a non-demo environment, set `ADMIN_EMAIL`, `ADMIN_NAME`, and a unique `ADMIN_PASSWORD` (at least 16 characters) in an appropriately protected process environment, then run `npm run admin:create`. Do not put a password on the command line. The script creates a new verified administrator and refuses to promote existing accounts. Public registration always creates clients. Two-factor authentication is not implemented and remains a production prerequisite for privileged access.

## Quality checks

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npx.cmd playwright install chromium
npm.cmd run test:e2e
npm.cmd run build
npm.cmd audit
```

Tests create disposable databases named `durak_test_*` and `durak_e2e_*`; the database user must have local `CREATEDB` privilege. They refuse to drop names outside their strict test prefix. E2E builds the production artifact and starts a separate server on port 3100 with `.next-e2e` output. ISOLATED_TEST_MODE and a strictly named disposable database are both required to exercise mocks in that compiled artifact. No development data is reset. The browser journey advances only its own test fixture's timestamps to exercise the authorized room window without waiting for a future appointment.

See [TEST_REPORT.md](TEST_REPORT.md) for actual results, screenshots, audit findings and limitations. See [FINAL_REPORT.md](FINAL_REPORT.md) for feature verification categories.

## Production requirements

Review [LEGAL_AND_PRIVACY_CHECKLIST.md](LEGAL_AND_PRIVACY_CHECKLIST.md), [SECURITY.md](SECURITY.md) and [DEPLOYMENT.md](DEPLOYMENT.md) before using real data. Production appointment creation is gated by `PRODUCTION_LEGAL_APPROVED=true`; that flag is an operational gate, not proof of legal compliance. Demo providers remain disabled on ordinary production databases even when DEMO_MODE is set. The automated E2E runner has a separate explicit gate restricted to generated durak_e2e_* databases. This deliverable has no clinical notes, diagnoses, recording, AI transcription, advertising trackers or public client ratings.

## Imagery and references

The local room and forest photos are editorial placeholders from Unsplash; they do not depict a named professional or a real consultation venue. Image origins are recorded in `public/images/ATTRIBUTION.md`. Technical references and compatibility decisions are listed in [ARCHITECTURE.md](ARCHITECTURE.md).
