"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, ShieldCheck, CalendarDays } from "lucide-react";
import { Brand } from "./brand";
const links = [
  ["/hakkinda", "Uzman hakkında"],
  ["/hizmetler", "Çalışma alanları"],
  ["/online-gorusme", "Süreç nasıl işler?"],
  ["/blog", "Yazılar"],
  ["/iletisim", "İletişim"],
];
export type PublicSite = {
  siteName: string;
  logoUrl?: string;
  showProfile: boolean;
  showEducation: boolean;
  showCertificates: boolean;
  showBlog: boolean;
  demonstration: boolean;
};
export function PublicHeader({ site }: { site: PublicSite }) {
  const { siteName, logoUrl } = site;
  const [open, setOpen] = useState(false),
    path = usePathname();
  return (
    <header className="public-header">
      <div className="container header-inner">
        <Brand name={siteName} logoUrl={logoUrl} />
        <nav aria-label="Ana menü" className={open ? "public-nav open" : "public-nav"}>
          {links
            .filter(
              ([href]) =>
                (href !== "/hakkinda" || site.showProfile) && (href !== "/blog" || site.showBlog),
            )
            .map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className={path === href ? "active" : ""}
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
          <Link className="mobile-login" href="/giris" onClick={() => setOpen(false)}>
            Danışan girişi
          </Link>
        </nav>
        <div className="header-actions">
          <Link href="/giris" className="login-link">
            Danışan girişi
          </Link>
          <Link href="/randevu" className="btn btn-primary btn-sm">
            <CalendarDays size={16} />
            Randevu al
          </Link>
          <button
            className="icon-btn mobile-menu"
            aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}
export function PublicFooter({ site }: { site: PublicSite }) {
  const { siteName, logoUrl } = site;
  return (
    <footer className="public-footer">
      <div className="container">
        <div className="footer-top">
          <div>
            <Brand name={siteName} logoUrl={logoUrl} />
            <p>
              Kendinizi dinlemek için
              <br />
              kendinize bir alan açın.
            </p>
            <span className="footer-secure">
              <ShieldCheck size={16} /> Gizliliğiniz önceliğimiz
            </span>
          </div>
          <div>
            <h3>Keşfedin</h3>
            {site.showProfile && <Link href="/hakkinda">Uzman hakkında</Link>}
            {site.showEducation && <Link href="/egitim">Eğitim ve yetkinlikler</Link>}
            {site.showCertificates && <Link href="/sertifikalar">Sertifikalar</Link>}
            <Link href="/hizmetler">Çalışma alanları</Link>
          </div>
          <div>
            <h3>Size yardımcı olalım</h3>
            <Link href="/randevu">Randevu oluşturun</Link>
            <Link href="/online-gorusme">Online görüşme süreci</Link>
            <Link href="/sikca-sorulan-sorular">Sıkça sorulan sorular</Link>
            <Link href="/iletisim">İletişim ve teknik destek</Link>
          </div>
          <div className="footer-note">
            <h3>Önemli bir hatırlatma</h3>
            <p>
              Bu platform acil destek hizmeti sunmaz. Acil bir tehlike durumunda{" "}
              <strong>112 Acil Çağrı Merkezi</strong> ile iletişime geçin.
            </p>
            {site.demonstration && (
              <p className="small">
                Bu site henüz gerçek hizmete açılmamıştır.
                <br />
                Gerçek danışan verisi girmeyin.
              </p>
            )}
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {siteName}. Tüm hakları saklıdır.
          </span>
          <div>
            <Link href="/gizlilik">Gizlilik</Link>
            <Link href="/kvkk">KVKK</Link>
            <Link href="/kullanim-kosullari">Kullanım koşulları</Link>
            <Link href="/iptal-iade">İptal ve iade</Link>
            <Link href="/onam">Bilgilendirilmiş onam</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
