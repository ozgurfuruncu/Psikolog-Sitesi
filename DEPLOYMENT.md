# Deployment and operations

## Local verified topology

Next.js on localhost:3000 → Prisma adapter → PostgreSQL 17 on 127.0.0.1:5432. The optional worker runs the durable notification cycle every minute. Private files and the embedded database are under ignored `.local/`. No application has been published externally.

Use the [README](README.md) for setup. Embedded PostgreSQL and the Docker Compose defaults are for development, not a hardened production database.

## Production preparation

1. Complete the legal/security checklists and replace all identity/content placeholders. Use a new database containing no demo client data.
2. Use an encrypted, backed-up PostgreSQL service reachable only by the application. Provision a restricted application role and a separate migration role. Require certificate-validated database TLS; never use `rejectUnauthorized:false` as a deployment shortcut.
3. Store secrets in the host's secret manager. Generate distinct `BETTER_AUTH_SECRET`, `JOB_SECRET`, database credentials and provider secrets. Set HTTPS `APP_URL` and `BETTER_AUTH_URL` to the same canonical origin.
4. Keep `DEMO_MODE=false`. Do not seed production. Mock payment/video providers are unavailable on ordinary production databases. ISOLATED_TEST_MODE is internal to the disposable E2E runner and must never be configured for a real deployment.
5. Configure the reviewed SMTP service, SPF/DKIM/DMARC, approved sender and processor contracts. Outbox delivery requires a running worker or protected scheduler.
6. Replace local disk storage with a private object store or mount a protected persistent volume for a single-instance deployment. Add antivirus/CDR, retention and backup policies.
7. Add privileged MFA/SSO, edge request/body limits, nonce CSP, alerting, scrubbed logs and independent security testing.
8. Run the full checks and apply migrations with the migration role. Review the generated SQL, especially GiST/check constraints.

## Build / process commands

```text
npm ci
npm run db:generate
npm run db:migrate
npm run build
npm run start
npm run jobs
```

Run the web server and worker under a service manager with restarts, health monitoring and graceful termination. A second worker can claim separate email outbox rows safely; calendar maintenance is serialized by the advisory lock. Do not run development mail previews or an exposed local database in production.

Alternatively, schedule `POST /api/jobs` once per minute with `Authorization: Bearer JOB_SECRET`. Do not put the secret in a URL, logs or a browser request. The server-side job is idempotent through reminder/outbox dedupe keys. Email transport itself is at-least-once; consider a provider idempotency feature when available.

## Payment operations

The implemented iyzico adapter only accepts `https://sandbox-api.iyzipay.com`; no live charge path is implemented. Configure sandbox keys and test credentials, use only provider-issued data in the sandbox buyer form and verify all signed responses with merchant-issued data. Reconcile late payments whose holds expired, cancelled appointments, failed delivery, duplicate webhooks and refunds. Real refund processing remains unimplemented; mock refund completion is development-only. Never claim a successful frontend redirect proves payment.

## Video operations

The current room simulates authorization and provides local camera/microphone controls. There is no participant-to-participant media, TURN/SFU service or production provider. Select and implement an appropriate authorized provider only after the service's professional/legal review. Do not route real sessions through the mock. Recording, transcription and automated clinical analysis remain disabled.

## Backup and recovery

Define approved RPO/RTO and retention with the operator. A suggested operational drill (not yet executed here):

1. Use `pg_dump --format=custom` with protected environment/service credentials into encrypted restricted backup storage; back up private files and storage metadata consistently.
2. Keep the schema/migration version and storage inventory with each backup. Do not include `.env` in ordinary source archives.
3. Restore into a separate isolated PostgreSQL cluster using `pg_restore`; never restore over production without an approved incident/change process.
4. Verify FK/check/exclusion constraints, appointment/payment counts, private file lookup, owned access and duplicate-event handling. Test one collision at SQL level after restore.
5. Record restoration duration and integrity results, then apply approved retention to backup copies. Include erasure restrictions and restored-data suppression procedures in the privacy design.

The native local PostgreSQL tools are inside the installed embedded package's platform directory; production should use its database service's supported backup utilities. Do not copy a live `.local/postgres` directory as a consistency-guaranteed backup.

## Release verification

Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build` and `npm audit`. Browser tests require a local database role permitted to create disposable test databases. Review [TEST_REPORT.md](TEST_REPORT.md) and screenshots. These checks do not replace a production provider test, legal review, accessibility audit or penetration test.

## Rollback

Keep deployable prior source/builds and compatible migration plans. Never automatically roll back a financial/appointment database to an earlier snapshot after live transactions. A source rollback must remain compatible with the current schema. For data incidents, reconcile provider payments and preserve necessary audit facts before a documented restore/repair.
