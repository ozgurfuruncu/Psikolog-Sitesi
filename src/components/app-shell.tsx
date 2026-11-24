"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Video,
  Wallet,
  MessageSquare,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  UsersRound,
  FileText,
  UserRound,
  Clock3,
  LifeBuoy,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { Brand } from "./brand";
import { authClient } from "@/lib/auth-client";
import { formatDate } from "@/lib/i18n";
import { useToast } from "./ui";
const clientLinks = [
  { href: "/panel", label: "Genel bakış", Icon: LayoutDashboard },
  { href: "/panel/randevular", label: "Randevularım", Icon: CalendarDays },
  { href: "/panel/gorusme", label: "Online görüşme", Icon: Video },
  { href: "/panel/odemeler", label: "Ödemelerim", Icon: Wallet },
  { href: "/panel/degerlendirmeler", label: "Değerlendirmelerim", Icon: MessageSquare },
  { href: "/panel/bildirimler", label: "Bildirimler", Icon: Bell },
  { href: "/panel/ayarlar", label: "Hesap ayarlarım", Icon: Settings },
];
const adminLinks = [
  { href: "/yonetim", label: "Genel bakış", Icon: LayoutDashboard },
  { href: "/yonetim/takvim", label: "Takvim", Icon: CalendarDays },
  { href: "/yonetim/randevular", label: "Randevu yönetimi", Icon: Clock3 },
  { href: "/yonetim/danisanlar", label: "Danışanlar", Icon: UsersRound },
  { href: "/yonetim/odemeler", label: "Ödemeler ve iadeler", Icon: Wallet },
  { href: "/yonetim/degerlendirmeler", label: "Özel değerlendirmeler", Icon: MessageSquare },
  { href: "/yonetim/profil", label: "Profesyonel profil", Icon: UserRound },
  { href: "/yonetim/icerik", label: "İçerik yönetimi", Icon: FileText },
  { href: "/yonetim/uygunluk", label: "Çalışma saatleri", Icon: Clock3 },
  { href: "/yonetim/destek", label: "Destek ve veri talepleri", Icon: LifeBuoy },
  { href: "/yonetim/ayarlar", label: "Ayarlar", Icon: Settings },
  { href: "/yonetim/posta", label: "Geliştirme posta kutusu", Icon: Mail },
];
export function AppShell({
  children,
  user,
  admin = false,
  demo = false,
  unread = 0,
  siteName = "Durak",
}: {
  children: React.ReactNode;
  user: { name: string; role: string };
  admin?: boolean;
  demo?: boolean;
  unread?: number;
  siteName?: string;
}) {
  const [open, setOpen] = useState(false),
    [loggingOut, setLoggingOut] = useState(false),
    path = usePathname(),
    router = useRouter(),
    toast = useToast();
  const links = admin ? adminLinks : clientLinks;
  const active =
    links.find((x) => x.href === path) ||
    [...links].reverse().find((x) => path.startsWith(x.href + "/"));
  return (
    <div className="app-shell">
      <aside
        className={`sidebar ${open ? "open" : ""}`}
        aria-label={admin ? "Yönetim menüsü" : "Hesap menüsü"}
      >
        <Brand name={siteName} />
        <button
          className="icon-btn mobile-sidebar-close"
          aria-label="Menüyü kapat"
          onClick={() => setOpen(false)}
        >
          <X size={19} />
        </button>
        <p className="sidebar-label">{admin ? "YÖNETİM ALANINIZ" : "SİZE ÖZEL ALAN"}</p>
        <nav>
          {links
            .filter((x) => demo || x.href !== "/yonetim/posta")
            .map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className={active?.href === href ? "active" : ""}
                onClick={() => setOpen(false)}
              >
                <Icon size={18} strokeWidth={1.65} />
                {label}
              </Link>
            ))}
        </nav>
        <div className="sidebar-footer">
          <div className="avatar">{user.name.charAt(0)}</div>
          <div className="sidebar-user">
            <strong>{user.name}</strong>
            <small>{admin ? "Yönetici hesabı" : "Danışan hesabı"}</small>
          </div>
          <button
            className="icon-btn"
            aria-label="Çıkış yap"
            disabled={loggingOut}
            onClick={async () => {
              setLoggingOut(true);
              try {
                const result = await authClient.signOut();
                if (result.error) throw new Error();
                router.push("/giris");
                router.refresh();
              } catch {
                toast("Çıkış yapılamadı. Tekrar deneyin.", true);
                setLoggingOut(false);
              }
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <button className="sidebar-scrim" aria-label="Menüyü kapat" onClick={() => setOpen(false)} />
      <div className="app-content">
        <header className="app-topbar">
          <div className="app-topbar-left">
            <button
              className="icon-btn mobile-menu"
              aria-label="Hesap menüsünü aç"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Menu size={20} />
            </button>
            <span>{admin ? "Yönetim paneli" : "Danışan paneli"}</span>
            <span style={{ color: "#b3bca9" }}>/</span>
            <span style={{ color: "var(--text)" }}>{active?.label || "Randevu ayrıntıları"}</span>
          </div>
          <div className="app-topbar-right">
            <span className="today">
              {formatDate(new Date(), {
                day: "numeric",
                month: "long",
                year: "numeric",
                weekday: "long",
              })}
            </span>
            <Link
              className="notification-bell"
              href={admin ? "/yonetim/randevular" : "/panel/bildirimler"}
              aria-label={`${unread} okunmamış bildirim`}
            >
              <Bell size={19} strokeWidth={1.5} />
            </Link>
            <Link
              href={admin ? "/yonetim/profil" : "/panel/ayarlar"}
              className="avatar"
              aria-label="Hesap ayarları"
            >
              {user.name.charAt(0)}
            </Link>
          </div>
        </header>
        <main id="main" className="app-main">
          {children}
          <p className="app-bottom-note">
            <ShieldCheck size={12} />
            {demo
              ? "Geliştirme ortamı · Veriler kurgusaldır · Gerçek danışan verisi girmeyin"
              : "Size özel alan · Bilgilerinizi güvenle yönetin"}
          </p>
        </main>
      </div>
    </div>
  );
}
