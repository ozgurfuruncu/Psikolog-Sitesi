ALTER TABLE "PsychologistProfile"
  ADD COLUMN "firstName" TEXT NOT NULL DEFAULT 'İsim',
  ADD COLUMN "lastName" TEXT NOT NULL DEFAULT 'Soyisim',
  ADD COLUMN "address" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "instagramUrl" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "linkedinUrl" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "otherSocialUrl" TEXT NOT NULL DEFAULT '',
  ALTER COLUMN "name" SET DEFAULT 'İsim Soyisim',
  ALTER COLUMN "title" SET DEFAULT 'Mesleki Unvan',
  ALTER COLUMN "biography" SET DEFAULT 'Hakkımda',
  ALTER COLUMN "languages" SET DEFAULT '';
-- Only replace the exact previous generated placeholder values. Operator edits are preserved.
UPDATE "PsychologistProfile" SET "name" = 'İsim Soyisim'
WHERE "isPlaceholder" = true AND "name" = 'Uzman bilgileri hazırlanıyor';
UPDATE "PsychologistProfile" SET "title" = 'Mesleki Unvan'
WHERE "isPlaceholder" = true AND "title" = 'Profesyonel unvan eklenecek';
UPDATE "PsychologistProfile" SET "biography" = 'Hakkımda'
WHERE "isPlaceholder" = true AND "biography" IN (
  'Bu alan, uzmanın kendi bilgileri ve mesleki yetkileri doğrulandıktan sonra güncellenecektir.',
  'Bu profil, uzman tarafından kendi mesleki bilgileriyle doldurulmayı beklemektedir. Eğitim, deneyim, unvan ve çalışma alanları gerçek belgeler üzerinden eklenecektir. Burada gerçek bir uzmanın kimliği veya yetkinliği temsil edilmez.'
);
ALTER TABLE "Education" ADD COLUMN "department" TEXT NOT NULL DEFAULT '', ADD COLUMN "degree" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SiteSettings"
  ALTER COLUMN "siteName" SET DEFAULT 'Site Adı',
  ADD COLUMN "browserTitle" TEXT NOT NULL DEFAULT 'Site Adı',
  ADD COLUMN "description" TEXT NOT NULL DEFAULT 'Web sitesi açıklaması',
  ADD COLUMN "homeHeadline" TEXT NOT NULL DEFAULT 'Kendinize bir alan açın.',
  ADD COLUMN "homeDescription" TEXT NOT NULL DEFAULT 'Görüşme sürecini inceleyin ve size uygun zamanı seçin.',
  ADD COLUMN "logoFileId" TEXT,
  ADD COLUMN "faviconFileId" TEXT,
  ADD COLUMN "showProfile" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "showEducation" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "showCertificates" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "showBlog" BOOLEAN NOT NULL DEFAULT true;
UPDATE "SiteSettings" SET "siteName" = 'Site Adı' WHERE "siteName" = 'Durak';
UPDATE "Certificate" SET title = 'Sertifika Adı', institution = 'Kurum Adı'
WHERE id = 'placeholder-certificate' AND "isPlaceholder" = true AND institution = 'Kurum bilgisi eklenecek';
