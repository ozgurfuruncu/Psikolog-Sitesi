import { PublicHeader, PublicFooter } from "@/components/public-shell";
import { getSettings } from "@/lib/appointments";
import { signedFileUrl } from "@/lib/files";
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const site = {
    ...settings,
    logoUrl: settings.logoFileId ? signedFileUrl(settings.logoFileId) : undefined,
    demonstration: process.env.PRODUCTION_LEGAL_APPROVED !== "true",
  };
  return (
    <>
      <PublicHeader site={site} />
      <main id="main">{children}</main>
      <PublicFooter site={site} />
    </>
  );
}
