import { PublicHeader, PublicFooter } from "@/components/public-shell";
import { getSettings } from "@/lib/appointments";
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <>
      <PublicHeader siteName={settings.siteName} />
      <main id="main">{children}</main>
      <PublicFooter siteName={settings.siteName} />
    </>
  );
}
