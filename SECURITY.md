# Security and privacy engineering

## Implemented controls

- Better Auth email verification, secure password hashing, database sessions, logout, one-use password reset and session revocation. Public role input is ignored. Adults-only signup requires server-checked declarations.
- Persisted role checks on administration pages/APIs and ownership checks on every appointment/payment/video/feedback/export operation. Another client's resource returns 404.
- Same-origin JSON/multipart mutation checks plus Better Auth's own CSRF/origin protection. Webhooks are exempt from browser origin checks and instead require provider signature verification.
- Authentication rate limits stored in PostgreSQL; application write limits per user; bounded global availability/support limits. Edge/WAF limits remain an operational requirement.
- Zod validation, parameterized Prisma/SQL access, React text escaping, no raw user HTML and no clinical content generator.
- Login and other sensitive forms use POST, so a native submission cannot put credentials into a query string. Shared action buttons remain disabled until hydration and while pending. E2E credentials are separate from local demo secrets. No secrets are printed by scripts.
- PostgreSQL range exclusion, transaction locks, unique event IDs, separate financial states and persisted price snapshots.
- Short-lived user-bound room credentials, ownership/status/time-window checks at issue and heartbeat, room closure on completion, no recording or production media transport.
- Random private file keys, maximum file size, MIME/signature checks, PDF active-content marker rejection, redaction acknowledgement and short-lived authorized public file links.
- HTTP nosniff, frame denial (with same-origin authorized document preview exceptions), CSP, referrer policy, camera/microphone scope and production HSTS. Authentication cookies become Secure in production; development HTTP cookies are local-only conveniences.
- No advertising trackers, session replay or external fonts in sensitive pages. Local image assets avoid third-party image requests by visitors.
- Minimal audit facts: actor ID, action, resource ID, timestamp. Provider keys, raw card information and clinical notes are absent. Prisma query logging and Better Auth logger are disabled; generic API failure logs include error type and, for TypeError, a code location only.

## Trust and deployment boundaries

Do not expose embedded PostgreSQL or development mode to the public internet. The local database password in the helper is only a localhost development convenience. Production needs unique database credentials, least-privilege database roles, TLS, encrypted disks/backups, private object storage and a secrets manager. Environment examples contain no production secret.

Production appointment creation requires an explicit legal-approval environment flag. Setting a flag does not establish professional authorization or compliance. Mock providers check environment and database gates. They are disabled on normal production databases. Compiled E2E artifacts can use them only with ISOLATED_TEST_MODE=true, DEMO_MODE=true and a generated durak_e2e_ followed by 12 hexadecimal characters database name. This gate exists only for explicitly isolated testing.

The initial CSP permits inline framework scripts/styles and development eval for Next.js. Production omits unsafe-eval. Before public release, implement a nonce-based CSP to remove the remaining inline-script allowance. No arbitrary user HTML is currently rendered. Apply edge request-body limits in addition to application size/signature checks; application Content-Length checks alone cannot bound chunked requests before parsing.

## Unresolved hardening

1. Enroll privileged users in MFA/SSO, enforce an administrative access policy and add session/device management. MFA is not implemented in this version.
2. Have an independent reviewer audit the authentication configuration, resource guards, provider adapters and privacy lifecycle. Passing automated tests is not penetration-test certification.
3. Add antivirus and PDF content disarm/reconstruction. MIME/header/PDF-marker validation cannot prove a document harmless; pre-publication human review is required. Image metadata removal and an in-app certificate redaction editor are not implemented.
4. Move files to a private object store for multi-instance hosting. Implement orphan-file cleanup, revocation and retention across active storage and backups.
5. Configure reliable provider-specific payment reconciliation, late-payment refund handling, real refund APIs and operational alerts. The included iyzico code targets sandbox only and is not live-verified.
6. Add nonce CSP, edge/WAF throttling, monitoring with PII scrubbing, transport security, audited secret rotation and dependency update automation.
7. Review transactional registration hooks for recovery if a nonessential profile/notification write fails after the auth user is created. Domain appointment/payment changes are atomic; all auth hook side effects are not one encompassing application transaction.
8. Define and implement approved retention/anonymization execution. The current product accepts/reviews requests and exports owned data; marking a deletion request resolved does not perform erasure.

## Responsible operational behavior

Never log passwords, authorization headers, cookies, verification/reset URLs, webhook bodies, identity numbers, card fields, session content or free-text feedback. Disable request-body capture and query-string capture at proxies/error-reporting providers. Do not publish screenshots with real identities. Repository screenshots use only fictional disposable test data.

For an incident: restrict access, revoke affected sessions/secrets, preserve necessary minimal audit evidence, assess impact with the responsible professional/legal adviser, perform required notifications, restore only verified backups, and document corrective actions. Incident procedures and legal response deadlines must be finalized before real data processing.
