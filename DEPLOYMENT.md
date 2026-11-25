# Deployment and operations

## 25 Kasım 2026 — paylaşılabilir demo yayını

**Durum:** Henüz oluşturulmuş ve test edilmiş bir genel HTTPS adresi yok. Yerel üretim derlemesi, 43 uygulama testi, 12 yayın yapılandırması testi ve 23 Playwright testi geçti. iPhone Safari (WebKit), Android Chrome (Chromium), Firefox, masaüstü Chrome/Edge ve 320–1440 px kontrolleri yerel HTTPS üzerinde yapıldı; bunlar internet yayını testi değildir. Render eklenti kataloğunda kurulu görünüyor, fakat bu çalışma oturumunda Render yayın araçları sunulmuyor. GitHub bağlayıcısının bu depoya erişimi yok; yerel Git kimliğiyle depo erişimi doğrulandı.

### Hazır yayın paketi

Kaynak dalı: `review-20261125`. Varsayılan `render.yaml` yalnızca **Free** web servisi ve ayrı **Free** PostgreSQL oluşturur. Önceden hazırlanmış ücretli üretim şablonu `render.production.yaml` adıyla korunur; inceleme için kullanılmaz. Tasarım ve mevcut özellikler korunmuştur.

- Next.js hem sayfaları hem API'yi çalıştırır. Better Auth doğrulamalı hesap, güvenli HTTPS çerezi, sunucuda oturum, kaynak denetimi ve veritabanı hız sınırlarını korur.
- `APP_URL` ve `BETTER_AUTH_URL` başlangıçta Render'ın `RENDER_EXTERNAL_URL` değerinden alınır; telefona localhost callback gönderilmez.
- `REVIEW_MODE=true` yalnızca `durak_review_<12 hex>` adlı ayrı veritabanında, mock ödeme/görüşme ve yöneticiye özel önizleme postasıyla çalışır. Normal üretim veritabanlarında demo korumaları sürer. Gerçek ödeme anahtarları reddedilir.
- Randevular, kullanıcılar, oturumlar ve 5 MB'a kadar yüklemeler PostgreSQL'de saklanır. Dosya baytları `PrivateFileContent` tablosundadır ve herkese açık metadata sorgularına eklenmez. Ücretsiz web servisinin geçici diskine bağımlılık yoktur.
- İlk açılışta şema geçişleri ve tekrar çalıştırılabilir seed otomatik yürür. Uygulamayla birlikte bildirim işleyicisi başlar. Ziyaretçinin veya kullanıcının yerel terminal çalıştırması gerekmez.
- Parolalar ve sunucu anahtarları Render tarafından rastgele üretilir; repoya, tarayıcıya ve rapora yazılmaz. Seed yeniden çalışırken mevcut parolalar değişmez.
- Arama motorları için `noindex, nofollow, noarchive`, robots meta verisi ve `robots.txt` kısıtlaması vardır. Bu ayarlar erişim kontrolünün yerine geçmez; yönetim işlevleri ADMIN yetkisi gerektirir.
- Kayıt için kurgusal `@example.test` adresi gerekir. E-posta doğrulaması ve şifre yenileme bağlantısı `/yonetim/posta` üzerinden yalnızca demo uzmanına görünür. Gerçek e-posta gönderilmez; danışanla birlikte kayıt testi için uzman erişimi gerekir.
- Demo uzmanı onaylı bir kurgusal randevuda **Demo odasını şimdi hazırla** düğmesini kullanabilir. İşlem randevu saatini şimdiye alır, çakışma kontrolü yapar ve denetim kaydı tutar. Kamera/mikrofon önizlemesi yereldir; gerçek klinik görüşme veya katılımcılar arası medya yoktur.

### Kullanıcının tamamlayacağı somut adım

Render araçları kullanılabilir hale geldiğinde yayın bu oturumdaki yetkiyle gerçekleştirilebilir. Aksi durumda terminal gerekmeden:

1. [Bu dal için Render kurulumunu açın](https://render.com/deploy?repo=https://github.com/ozgurfuruncu/Psikolog-Sitesi/tree/review-20261125). Render hesabıyla giriş yapın.
2. Gerekirse **Connect GitHub** ile yalnızca `ozgurfuruncu/Psikolog-Sitesi` deposunu yetkilendirin. Blueprint dalının `review-20261125`, dosyanın `render.yaml` olduğunu kontrol edin.
3. Blueprint adı olarak `psikolog-inceleme` girin. `psikolog-review` web servisi ve `psikolog-review-db` veritabanının ikisi de **Free** olmalı. Ücretli yükseltme seçmeyin. **Deploy** düğmesine basın.
4. [Render panelinde](https://dashboard.render.com/) `psikolog-review` → **Events** bölümünde **Live** durumunu bekleyin. Üstteki gerçek `https://…onrender.com` adresi paylaşılacak adrestir. Bu adres oluşmadan veya test edilmeden yayın tamamlandı sayılmaz.
5. `psikolog-review` → **Environment** altında `DEMO_CLIENT_PASSWORD` ve `DEMO_ADMIN_PASSWORD` değerlerini kendi hesabınızdan görüntüleyin. Danışan: `danisan@example.test`; uzman: `uzman@example.test`. Uzman şifresini yalnızca özel bir kanaldan paylaşın; GitHub'a veya bu rapora eklemeyin.

Bu kurulum mevcut `.env`, yerel veritabanı veya yerel demo şifrelerini buluta taşımaz. Render panelinin ücretli bir plan, ek kaynak veya ödeme talep etmesi halinde bu işlem için mevcut yetki yoktur.

### Maliyet ve süre sınırı

Seçilen kaynakların compute planı Free'dir. Render'ın [ücretsiz plan açıklamasına](https://render.com/docs/free) göre web servisi 15 dakika hareketsizlikten sonra uyur ve sonraki istekte yaklaşık bir dakika içinde açılır; ücretsiz PostgreSQL 30 gün sonra sona erer. Veri web uygulamasının yeniden başlatılmalarında korunur; 30 günlük veritabanı ömrünün ötesinde kalıcılık vaadi yoktur. Ücretsiz kullanım kotaları ve mevcut hesabın ücretlendirme ayarları geçerlidir. Bu işlemde ücretli abonelik veya kaynak oluşturulmadı. Kalıcı kullanım için ayrı ücretsiz veritabanı veya açık onayla ücretli plan değerlendirilmelidir.

Bulut yayını başarıyla tamamlandığında kullanıcının bilgisayarının açık kalması gerekmez. Şu an henüz genel URL bulunmadığından bu koşul dış ağdan doğrulanmış değildir.

### Gerçek genel adreste kabul testi

`playwright.public.config.ts` yerel sunucu başlatmaz, sertifika hatalarını yoksaymaz ve localhost adresini kabul etmez. `.env.review.example` şablonunu yerelde göz ardı edilen `.env.review` dosyasına kopyalayıp gerçek URL ile yalnızca inceleme parolalarını sağlayın. Sonra geliştirici `npm run test:public` çalıştırır. Kullanıcının bunu ziyaret başına çalıştırması gerekmez.

İki mobil proje ana sayfa/menü/profil/sertifikalar, iki demo rolü, yeni kurgusal kayıt ve e-posta doğrulama, yeniden yüklemede oturum, CSRF/yetki denetimi, randevu/onay, mock ödeme, takvim, demo odası, özel değerlendirme, ayar kaydı ve çıkışı genel URL üzerinden sınar. Testler yalnızca inceleme verileri oluşturur; ekran kaydı, trace ve otomatik ekran görüntüsü kapalıdır. Genel URL henüz bulunmadığı için bu testler **çalıştırılmadı**; yalnızca yapılandırma/test keşfi doğrulandı.

Platform değerlendirmesi: Render mevcut Node.js/PostgreSQL mimarisini doğrudan çalıştırır. [Vercel](https://vercel.com/docs/functions/runtimes) için kalıcı dosya sistemi ve işleyici ayrıca ele alınmalıdır. [Railway](https://docs.railway.com/pricing/free-plan) ücretsiz kaynak kotasıyla alternatif olabilir. Mevcut Sites barındırması Cloudflare Worker çıktısı ve HTTP tabanlı bağlantılar beklediğinden bu Node.js/PostgreSQL uygulamasının birebir yayını için uygun değildir; framework/veritabanı dönüşümü yapılmadı.

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
