import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui";
import "./globals.css";
import { getSite } from "@/lib/site";
import { signedFileUrl } from "@/lib/files";
import { isReview } from "@/lib/env";
export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  return {
    title: { default: site.browserTitle, template: `%s · ${site.siteName.replaceAll("%", "")}` },
    description: site.description,
    openGraph: {
      title: site.browserTitle,
      description: site.description,
      siteName: site.siteName,
      locale: "tr_TR",
      type: "website",
    },
    icons: site.faviconFileId ? { icon: signedFileUrl(site.faviconFileId) } : undefined,
    robots: {
      index: !isReview() && process.env.PRODUCTION_LEGAL_APPROVED === "true",
      follow: !isReview() && process.env.PRODUCTION_LEGAL_APPROVED === "true",
    },
  };
}
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await getSite();
  return (
    <html lang="tr" data-scroll-behavior="smooth">
      <body>
        <ToastProvider>
          <a className="skip-link" href="#main">
            İçeriğe geç
          </a>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
