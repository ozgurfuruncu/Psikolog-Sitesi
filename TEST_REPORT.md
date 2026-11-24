# Test report

Date: 2026-11-24, Europe/Istanbul. Environment: Windows, Node.js 24.19.0, PostgreSQL 17.12, Next.js 16.4.6, React 19.3.1, Prisma 7.10.1, Better Auth 1.7.27, Vitest 4.1.12, Playwright 1.65.1 / Chromium 159.

## Executed results

| Check | Actual result |
| --- | --- |
| Initial PostgreSQL migrations + demo seed | Passed; all three migrations applied to persistent local PostgreSQL |
| ESLint (`npm run lint`) | Passed, zero warnings/errors |
| TypeScript (`npm run typecheck`) | Passed |
| Vitest (`npm test`) | **36 passed, 0 failed**, four files |
| Playwright full suite (`npm run test:e2e`) | **10 passed, 0 failed** |
| Optimized production build | Passed; both ordinary build and isolated compiled browser artifact |
| Dependency audit | **0 vulnerabilities**; full JSON in `docs/dependency-audit.json` |
| axe WCAG scan | Zero detected A/AA violations on homepage, login, booking and client overview |
| Screenshot review | Nine real desktop/mobile PNGs; loading placeholders were excluded from final captures |

After the full 10/10 run, the closed mobile sidebar was removed from the hidden keyboard-focus path with CSS visibility; the focused mobile and axe checks passed **2/2** again. A visual review also corrected the current-day calendar button's background so its light date text remains visible; the desktop navigation/screenshot check passed **1/1** again on the rebuilt artifact.

Counts above are executed outcomes, not estimated coverage percentages. Unit/integration and browser databases are disposable and separate from the persistent development database. The browser suite builds and runs the compiled application on port 3100. Its explicit isolated-test gate permits mocks only against generated `durak_e2e_` plus 12 hexadecimal character database names. It never activates mocks on a normal production database.

## Unit / database coverage

- Registration, password hashing, adult-only signup and role injection rejection.
- Verification-gated login, emailed verification, invalid password, session persistence, logout, password reset, single-use reset token and revocation of previous sessions.
- Authoritative booking snapshots and consent/history writes; future/working-time validation.
- Client/admin role boundaries and cross-client ownership checks.
- Occupied slots with no client identities, concurrent requests and native SQL exclusion-constraint rejection.
- Approval, alternative proposals/acceptance, client rescheduling, rejection, cancellation and expired hold release.
- Bad webhook signatures and amount mismatch, failed payments, successful retry, duplicate events and concurrent checkout reuse.
- Video identity, signature, access time window, room completion and token invalidation checks.
- Completed-session feedback uniqueness, score validation and reminder/outbox deduplication.
- MIME/header spoofing, disallowed SVG, oversized files, PDF JavaScript and accepted permitted signatures.
- Istanbul UTC conversion and production/isolated-test provider gates.

## Browser coverage

1. Guest visits public profile/certificate modal; registers and verifies a new account; logs in; requests a slot; administrator proposes another date; client accepts, fails a test payment and retries successfully; both roles enter the authorized development room; client tests fake camera/microphone devices and controls; administrator completes the session; client submits private feedback; administrator reads it; public pages expose no feedback.
2. Anonymous/private route protection, wrong-role writes, CSRF, IDOR, room/feedback ownership, forged webhook and underage/role-injection registration rejection.
3. Certificate upload spoof rejection, permitted upload, redaction publication gate and private file access after logout.
4. Profile update, owned JSON export, persisted personal-data request and support form submission.
5. Administrator page smoke checks, service create/deactivation, website content publication/removal and day/week/month calendar switching.
6. Public-page navigation, runtime-error detection and desktop screenshots.
7. Mobile navigation, page overflow assertions, client dashboard and account-settings navigation, mobile screenshots.
8. Sensitive POST forms and disabled action buttons without JavaScript / before hydration.
9. Persisted authentication throttling, including actual HTTP 429 on excessive attempts.
10. Automated axe WCAG A/AA checks on four representative pages.

The room journey moves only its newly created fixture into the current time window after a real successful test payment. The server's time/identity guards remain enabled. This avoids waiting days for a future appointment and is not an application bypass available to clients. Camera/microphone tests use Chromium-generated test devices; no physical device, real participant media or recording was used.

## Issues found and corrected

- Windows native PostgreSQL initialization rejected the Unicode user path: the helper now uses the same workspace's short path during initialization.
- Empty optional certificate verification links caused a thrown URL exception: validation now returns the correct controlled result.
- Sensitive forms defaulted to native GET before hydration: all mutation forms now use POST; shared buttons wait for hydration and honor pending state. Local demo secrets used during early QA were rotated and old sessions revoked; final E2E credentials are disposable and distinct.
- Repeated checkout calls could create redundant sessions: payment-specific transaction locking and short-lived checkout reuse were added.
- Reminder recovery could send several thresholds together: the nearest reminder interval is now selected, with persisted deduplication.
- Several muted text colors failed contrast on sage backgrounds: colors were darkened and axe scans pass on the reviewed pages.
- A client dashboard grid preserved a table's intrinsic width on mobile: grid items/cards now permit shrinking and tables scroll within their own container.
- Early screenshots sometimes captured a loading skeleton: captures now wait for headings, completed content, fonts and local images.
- Test assertions ran before asynchronous form completion: tests now wait for route/state/database outcomes.
- Development rebuilds produced intermittent framework errors during rapid navigation: final browser QA uses the optimized compiled artifact, with strictly isolated test providers.
- Initial dependency audit reported vulnerable Nodemailer and a Prisma CLI transitive dependency: compatible patched versions were installed; final audit reports zero.

## Screenshots

| Page | Desktop | Mobile |
| --- | --- | --- |
| Homepage | [PNG](docs/screenshots/home-desktop.png) | [PNG](docs/screenshots/home-mobile.png) |
| Booking | [PNG](docs/screenshots/booking-desktop.png) | [PNG](docs/screenshots/booking-mobile.png) |
| Client overview | [PNG](docs/screenshots/client-desktop.png) | [PNG](docs/screenshots/client-mobile.png) |
| Administrator overview | [PNG](docs/screenshots/admin-desktop.png) | — |
| Calendar | [PNG](docs/screenshots/calendar-desktop.png) | — |
| Development session | [PNG](docs/screenshots/session-desktop.png) | — |

## Palette refresh recheck — 2026-11-24, 19:05 Europe/Istanbul

The public pages, authentication views and both portals now use brighter mint, sky-blue and peach surfaces, teal actions, and soft lavender/sunlight accents. Muted copy remains dark enough on the colored surfaces; the primary button's white-label contrast is approximately 5.43:1.

- Re-executed lint and TypeScript checks: passed.
- Re-executed unit/database suite: **36 passed, 0 failed**.
- Re-executed full Chromium suite against a freshly compiled production artifact: **10 passed, 0 failed**, including the booking journey, mobile overflow checks and four-page axe WCAG scan.
- Recreated all nine desktop/mobile screenshots and visually reviewed the public and client views.
- Sanitized machine-readable results: [browser-test-results.json](docs/browser-test-results.json).

## Verification limits

No iyzico merchant keys, SMTP account or authorized production video service were supplied. Real provider settlement/refunds, external email delivery and participant media transport were not tested. Docker Compose was supplied but not started because Docker Desktop's daemon was unavailable; real embedded PostgreSQL was used instead. No Firefox/WebKit/iOS device matrix, full manual screen-reader audit, load/penetration test, encrypted-backup restore drill or legal compliance review was performed. Some administrator edit combinations are implemented but only smoke-tested; the coverage above identifies the actual exercised flows. Zero axe findings on four pages is not a certification of site-wide WCAG conformance.
