# Legal and privacy production review — Turkey

Status: unresolved review checklist, prepared 2026-11-24. This is not legal advice, a compliance determination or permission to provide healthcare. The specific professional title, legal entity, service scope and operating model have not been supplied. **Do not enter real client data or activate live sessions before these points are reviewed.**

## Professional authority and remote services

- [ ] Obtain the actual professional identity, diploma, title, authorized scope of practice and any establishment/work permissions; verify with the relevant authority. Do not infer authority from a certificate.
- [ ] Have counsel and the responsible professional classify the proposed service and determine which healthcare/professional rules apply to this practitioner and establishment.
- [ ] Review the current remote healthcare framework, establishment permissions, software registration/approval and provider suitability where applicable. The Ministry-published regulation discusses authorized facilities, professionals and remote information systems; whether this independent practitioner's intended service can use this platform remains unresolved. [Ministry regulation publication](https://antalyaism.saglik.gov.tr/TR-234670/uzaktan-saglik-hizmetlerinin-sunumu-hakkinda-yonetmelik.html).
- [ ] Select an appropriate authorized video provider after that review; document participant identity, location, privacy, emergency escalation, disconnection and continuity policies. A generic video API is not evidence of authorization.
- [ ] Keep minors disabled until a separately reviewed guardian/consent/safeguarding workflow exists.

## Website, titles, advertising and educational content

- [ ] Review applicable advertising and promotion restrictions, titles, service descriptions, price display and appointment calls to action. The current placeholder website is not an approved advertisement.
- [ ] Replace placeholder profile, qualifications and certificate entries with documented, consented information. Redact personal information before publication.
- [ ] Review each educational article before publication. Do not add fabricated testimonials, public client ratings, guaranteed results or unreviewed clinical advice.
- [ ] Confirm the website identity, contact details, registered address and professional disclosures.

## KVKK governance

- [ ] Identify the data controller and processors; document necessary purposes, legal bases, recipients, data categories and special-category conditions. An appointment with a psychology professional can itself reveal sensitive context and is treated as sensitive by this application.
- [ ] Separate information notices, necessary contractual declarations and any consent that is actually required. Do not assume one broad checkbox establishes all legal bases.
- [ ] Finalize versioned privacy, KVKK, informed consent, terms and cancellation/refund texts. All current legal pages explicitly remain drafts.
- [ ] Assess VERBIS and other registration/organizational obligations for the actual operator.
- [ ] Set minimum collection, retention, restriction, access, correction, deletion/anonymization, identity verification and response procedures. Include support free text, email outbox, provider copies, logs, private files and backups.
- [ ] Implement the approved erasure procedure; do not merely mark a request resolved. Record legal retention exceptions and explain them to the requesting person.
- [ ] Prepare incident response, breach reporting, staff confidentiality, access review and audit procedures.

## International transfers and processors

- [ ] Inventory hosting, email, backups, video, payment, support and monitoring locations and subprocessors.
- [ ] Determine an applicable international transfer mechanism with counsel. The KVKK authority describes the amended transfer framework and safeguards; do not rely on outdated blanket consent language. [KVKK transfer guidance](https://www.kvkk.gov.tr/Icerik/2053/Yurtdisina-Aktarim).
- [ ] Where standard contracts are used, select the correct controller/processor arrangement, complete necessary annexes and follow current execution/notification requirements. [KVKK standard-contract guidance](https://www.kvkk.gov.tr/Icerik/8170/Yurt-Disina-Kisisel-Veri-Aktariminda-Kullanilacak-Standart-Sozlesmelerde-Dikkat-Edilmesi-Gereken-Hususlara-Iliskin-Kamuoyu-Duyurusu).
- [ ] Sign appropriate processing/confidentiality terms and confirm deletion, access, security and incident obligations with each provider.

## Payment and consumer matters

- [ ] Confirm merchant eligibility, the actual service category and permitted charging/price-display practices with iyzico and counsel.
- [ ] Use reviewed provider-hosted checkout, authenticated callbacks/retrieval and reconciliation. Do not collect card details in this application.
- [ ] Finalize invoicing, financial retention, refund policy, consumer rights and applicable distance-service disclosures. Example cancellation timing is not a legal conclusion about refund entitlement.
- [ ] Test sandbox success/failure, delayed and duplicate callbacks, expiry/cancellation races and refunds before a separately authorized live integration.

## Technical release gate

- [ ] Complete all items above with named responsible reviewers and dated evidence.
- [ ] Provision real administrators securely, add MFA, replace demo database/secrets, configure TLS/encryption, private storage/scanning, backups and monitoring.
- [ ] Implement and verify the production video provider and real payment/refund processes. Current development providers do not become production providers by toggling `DEMO_MODE`.
- [ ] Perform independent security and accessibility assessment; inspect production screens and all legal/identity content.
- [ ] Only then decide whether to set `PRODUCTION_LEGAL_APPROVED=true` for the reviewed environment. That setting is an operational gate, not a certification.

Unchecking a task in this file does not authorize data collection. The platform has no emergency response service; its visible guidance directs immediate emergencies to Turkey's 112 service, as requested in the brief.
