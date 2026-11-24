import Image from "next/image";
import { Brand } from "@/components/brand";
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-layout">
      <aside className="auth-story">
        <Brand />
        <div>
          <h2>
            Kendinize dönmek
            <br />
            için küçük bir <em>durak.</em>
          </h2>
          <p>Yavaşlamak, kendinizi dinlemek ve kendi ritminizde ilerlemek için bir alan.</p>
          <Image
            loading="eager"
            className="story-image"
            src="/images/calm-room.jpg"
            alt="Temsili, doğal ışık alan sakin bir iç mekân"
            width={600}
            height={500}
          />
        </div>
        <small>
          Temsili mekân görseli · Unsplash
          <br />
          Gizliliğe duyarlı · Yetişkinlere yönelik
        </small>
      </aside>
      <main id="main" className="auth-main">
        {children}
      </main>
    </div>
  );
}
