# Implementation plan

## Scope and assumptions
- Empty Windows workspace inspected on 2026-11-24; no existing code or AGENTS.md found.
- Build a local repository application with Next.js App Router, TypeScript, PostgreSQL, Prisma, Better Auth, Zod, Tailwind, Radix primitives, and Lucide.
- Docker is installed but its daemon is unavailable. Provide Docker Compose and investigate a persistent, embedded PostgreSQL development fallback. Never substitute in-memory arrays for persistence.
- All visible content is Turkish; code and documentation are English. No real clinician identity, credentials, portrait, testimonials, or medical content will be invented.
- No production publication is requested. Production payments/video stay disabled pending legal review and credentials.

## Phases
1. [complete locally] Dependency compatibility, setup, three database migrations, design system.
2. [complete locally] Public pages, editable profile, selected website text slots, services, blog, FAQ, legal drafts.
3. [verified] Authentication, email verification/reset, adult registration, role/ownership guards.
4. [verified] Transactional appointments, availability, slot holds, alternatives and cancellation.
5. [verified locally] Client dashboard, test payments, development waiting room, account/privacy settings.
6. [implemented; core operations verified] Administrator dashboard, calendar, client/content/service/settings management.
7. [development verified; external review pending] Mock payments/video, SMTP interface and credential-gated iyzico sandbox adapter.
8. [implemented; core persistence verified] Private feedback, notifications/outbox, reminders, ICS, waitlist, support.
9. [local audit complete] Security fixes, representative axe checks, responsive layouts, private uploads. Independent production audit remains external.
10. [complete locally] 36 unit/database tests and 10 browser tests passed; production builds, nine screenshots, zero-vulnerability audit and documentation completed. The final focused mobile/accessibility check also passed 2/2 after the closed-navigation visibility refinement.

## Final implementation boundary
The essential development appointment journey is implemented and verified. External payment/email delivery and a real production video provider were not available for verification. MFA, Google Calendar OAuth, full translation, document scanning/redaction UI and automated legally reviewed erasure are explicitly outside the completed implementation; see FINAL_REPORT.md. Do not classify this as production-ready.

## Verification policy
Run real commands and retain actual outcomes. Prioritize the full registration → booking → approval/alternative → sandbox payment → authorized development room → completion → private feedback journey. Mark limitations honestly and distinguish external blockers from verified behavior.

## Official references consulted
- https://nextjs.org/docs/app/getting-started/installation
- https://www.prisma.io/docs/orm/v7
- https://better-auth.com/docs/adapters/prisma
- https://better-auth.com/docs/authentication/email-password
- https://docs.iyzico.com/en/payment-methods/checkoutform/cf-implementation
- https://docs.iyzico.com/en/advanced/webhook
- https://docs.iyzico.com/en/advanced/response-signature-validation
