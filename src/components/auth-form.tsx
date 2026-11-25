"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui";
import { MailCheck, Info } from "lucide-react";
export type AuthMode = "login" | "register" | "forgot" | "reset";
const text = {
  login: {
    title: "Yeniden hoş geldiniz.",
    description: "Kendinize ayırdığınız alana giriş yapın.",
    submit: "Giriş yap",
  },
  register: {
    title: "Kendinize bir alan açın.",
    description: "Randevu sürecinizi takip etmek için hesabınızı oluşturun.",
    submit: "Hesap oluştur",
  },
  forgot: {
    title: "Şifrenizi yenileyelim.",
    description: "Hesabınıza kayıtlı e-posta adresinize yenileme bağlantısı göndereceğiz.",
    submit: "Yenileme bağlantısı gönder",
  },
  reset: {
    title: "Yeni bir başlangıç.",
    description: "Hesabınız için güçlü ve yeni bir şifre belirleyin.",
    submit: "Şifreyi güncelle",
  },
};
export function AuthForm({
  mode,
  token,
  demo = false,
  verified = false,
}: {
  mode: AuthMode;
  token?: string;
  demo?: boolean;
  verified?: boolean;
}) {
  const [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(false),
    router = useRouter();
  const t = text[mode];
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    setError("");
    try {
      const email = String(f.get("email") || ""),
        password = String(f.get("password") || "");
      if (mode === "register") {
        const response = await fetch("/api/auth/sign-up/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: f.get("name"),
            email,
            password,
            adultConfirmed: f.get("adult") === "on",
            termsAccepted: f.get("terms") === "on",
            callbackURL: "/giris?verified=1",
          }),
        });
        if (!response.ok) {
          if (response.status === 503)
            throw new Error(
              "Hesap kaydı henüz hizmete açılmadı. Lütfen daha sonra tekrar deneyin.",
            );
          const failure = await response.json();
          if (
            failure.message ===
            "Demo için @example.test uzantılı kurgusal bir e-posta adresi kullanın."
          )
            throw new Error(failure.message);
          throw new Error("Hesap oluşturulamadı. Bilgileri kontrol edip tekrar deneyin.");
        }
        setSuccess(true);
      } else if (mode === "login") {
        const result = await authClient.signIn.email({ email, password });
        if (result.error)
          throw new Error(
            result.error.status === 403
              ? "E-posta adresinizi doğrulayın. Doğrulama bağlantısı e-posta kutunuza gönderildi."
              : "E-posta veya şifre doğru değil. Çok sayıda denemede bir süre beklemeniz gerekebilir.",
          );
        const user = await fetch("/api/me").then((r) => r.json());
        router.push(user.role === "ADMIN" ? "/yonetim" : "/panel");
        router.refresh();
      } else if (mode === "forgot") {
        const result = await authClient.requestPasswordReset({
          email,
          redirectTo: "/sifre-yenile",
        });
        if (result.error) throw new Error("İşlem tamamlanamadı. Bir süre sonra yeniden deneyin.");
        setSuccess(true);
      } else {
        const result = await authClient.resetPassword({ newPassword: password, token });
        if (result.error)
          throw new Error(
            "Yenileme bağlantısı geçersiz veya süresi dolmuş. Yeni bir bağlantı isteyin.",
          );
        setSuccess(true);
      }
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin."
          : (err as Error).message,
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="auth-form">
      <Link href="/" className="auth-top-link">
        Ana sayfaya dön
      </Link>
      <h1>{t.title}</h1>
      <p>{t.description}</p>
      {verified && (
        <div className="form-success" style={{ marginBottom: 20 }}>
          E-posta adresiniz doğrulandı. Giriş yapabilirsiniz.
        </div>
      )}
      {success ? (
        <div>
          <div className="success-icon">
            <MailCheck size={30} />
          </div>
          <div className="form-success" role="status">
            {mode === "reset"
              ? "Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz."
              : mode === "register"
                ? "Bilgileriniz uygunsa doğrulama bağlantınız gönderildi. E-posta adresinizi doğruladıktan sonra giriş yapabilirsiniz."
                : "Bu adresle bir hesabınız varsa şifre yenileme bağlantısı gönderildi."}
          </div>
          {demo && mode !== "reset" && (
            <p className="notice">
              <Info size={18} />
              Demo ortamında e-postalar gönderilmez. Yetkili demo yönetici, geliştirme posta
              kutusundan bağlantıyı açabilir.
            </p>
          )}
          <Link href="/giris" className="btn btn-outline btn-full" style={{ marginTop: 22 }}>
            Giriş sayfasına dön
          </Link>
        </div>
      ) : (
        <form method="post" onSubmit={submit}>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          {mode === "register" && (
            <div className="field">
              <label htmlFor="name">Adınız soyadınız</label>
              <input
                id="name"
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
                placeholder="Adınız ve soyadınız"
              />
            </div>
          )}
          {mode !== "reset" && (
            <div className="field">
              <label htmlFor="email">E-posta adresiniz</label>
              <input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                required
                maxLength={254}
                placeholder="ornek@eposta.com"
              />
            </div>
          )}
          {mode !== "forgot" && (
            <div className="field">
              <div className="password-label">
                <label htmlFor="password">{mode === "reset" ? "Yeni şifreniz" : "Şifreniz"}</label>
                {mode === "login" && (
                  <Link prefetch={false} href="/sifremi-unuttum">
                    Şifremi unuttum
                  </Link>
                )}
              </div>
              <input
                id="password"
                type="password"
                name="password"
                required
                minLength={mode === "login" ? 1 : 12}
                maxLength={128}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder={mode === "login" ? "Şifrenizi girin" : "En az 12 karakter"}
              />
              {mode !== "login" && (
                <small>
                  En az 12 karakter kullanın. Başka bir hesapta kullandığınız şifreyi seçmeyin.
                </small>
              )}
            </div>
          )}
          {mode === "register" && (
            <>
              <label className="checkbox-field">
                <input type="checkbox" name="adult" required />
                <span>18 yaşında veya daha büyük olduğumu onaylıyorum.</span>
              </label>
              <label className="checkbox-field">
                <input type="checkbox" name="terms" required />
                <span>
                  <Link href="/kullanim-kosullari" className="text-link" target="_blank">
                    Kullanım koşullarını
                  </Link>{" "}
                  ve{" "}
                  <Link href="/gizlilik" className="text-link" target="_blank">
                    gizlilik politikasını
                  </Link>{" "}
                  okudum. Metinlerin geliştirme taslağı olduğunu biliyorum.
                </span>
              </label>
            </>
          )}
          <Button className="btn-full" loading={loading} type="submit">
            {t.submit}
          </Button>
          {mode === "login" && (
            <p className="auth-bottom">
              Henüz hesabınız yok mu?{" "}
              <Link prefetch={false} className="text-link" href="/kayit">
                Hesap oluşturun
              </Link>
            </p>
          )}
          {mode === "register" && (
            <p className="auth-bottom">
              Zaten hesabınız var mı?{" "}
              <Link className="text-link" href="/giris">
                Giriş yapın
              </Link>
            </p>
          )}
          {["forgot", "reset"].includes(mode) && (
            <p className="auth-bottom">
              <Link href="/giris" className="text-link">
                Giriş sayfasına dön
              </Link>
            </p>
          )}
        </form>
      )}
      {demo && mode === "login" && (
        <div className="auth-demo">
          <span className="draft-label">Yalnızca geliştirme ortamı</span>
          <p>
            Danışan: <code>danisan@example.test</code>
            <br />
            Yönetici: <code>uzman@example.test</code>
          </p>
          <p>Hesaba özel şifreleri siteyi paylaşan kişiden alın. Gerçek danışan verisi girmeyin.</p>
        </div>
      )}
      <p className="small muted" style={{ marginTop: 30, fontSize: ".72rem" }}>
        Bu platform acil destek hizmeti değildir. Acil tehlike durumunda 112’yi arayın.
      </p>
    </div>
  );
}
