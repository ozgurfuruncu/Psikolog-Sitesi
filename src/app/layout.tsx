import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "Durak · Kendine bir alan", template: "%s · Durak" },
  description:
    "Uzman bilgilerini inceleyin, online randevu sürecinizi güvenle yönetin. Geliştirme ortamı.",
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
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
