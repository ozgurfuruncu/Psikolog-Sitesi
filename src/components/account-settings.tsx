"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, Button, useToast } from "./ui";
import { authClient } from "@/lib/auth-client";
import { Download, Info } from "lucide-react";
type Profile = {
  name: string;
  email: string;
  profile: { phone: string | null } | null;
  preferences: { email: boolean; reminders: boolean; feedbackInvitation: boolean } | null;
  dataRequests: Array<{
    id: string;
    type: string;
    status: string;
    createdAt: string;
    resolution: string;
  }>;
};
export function AccountSettings({ profile: p }: { profile: Profile }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    toast = useToast(),
    router = useRouter();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api("/api/profile", {
        name: f.get("name"),
        phone: f.get("phone"),
        emailNotifications: f.get("email") === "on",
        reminders: f.get("reminders") === "on",
        feedbackInvitation: f.get("feedback") === "on",
      });
      toast("Bilgileriniz güncellendi.");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="settings-layout">
      <div className="card">
        <h3>Kişisel bilgiler ve tercihler</h3>
        <form method="post" onSubmit={submit}>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <div className="field">
            <label htmlFor="profile-name">Adınız soyadınız</label>
            <input
              id="profile-name"
              name="name"
              defaultValue={p.name}
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
            />
          </div>
          <div className="field">
            <label htmlFor="profile-email">Doğrulanmış e-posta</label>
            <input id="profile-email" value={p.email} disabled />
            <small>Adres değişikliği için destek üzerinden başvurun.</small>
          </div>
          <div className="field">
            <label htmlFor="profile-phone">Telefon (isteğe bağlı)</label>
            <input
              id="profile-phone"
              name="phone"
              defaultValue={p.profile?.phone || ""}
              type="tel"
              autoComplete="tel"
              maxLength={30}
            />
          </div>
          <h3 style={{ marginTop: 30 }}>Bildirim tercihleriniz</h3>
          <label className="checkbox-field">
            <input type="checkbox" name="email" defaultChecked={p.preferences?.email !== false} />
            <span>E-posta bildirimleri almak istiyorum.</span>
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              name="reminders"
              defaultChecked={p.preferences?.reminders !== false}
            />
            <span>Randevu hatırlatmaları almak istiyorum.</span>
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              name="feedback"
              defaultChecked={p.preferences?.feedbackInvitation !== false}
            />
            <span>Görüşme sonrası değerlendirme daveti almak istiyorum.</span>
          </label>
          <Button type="submit" loading={busy}>
            Değişiklikleri kaydet
          </Button>
        </form>
      </div>
      <div>
        <section className="card">
          <h3>Şifre ve güvenlik</h3>
          <p className="small">
            Şifrenizi değiştirmek için doğrulanmış e-posta adresinize tek kullanımlık bağlantı
            gönderebilirsiniz.
          </p>
          <Button
            variant="outline"
            onClick={async () => {
              const result = await authClient.requestPasswordReset({
                email: p.email,
                redirectTo: "/sifre-yenile",
              });
              toast(
                result.error
                  ? "Bağlantı gönderilemedi. Daha sonra deneyin."
                  : "Şifre yenileme bağlantısı gönderildi.",
                !!result.error,
              );
            }}
          >
            Şifre yenileme bağlantısı gönder
          </Button>
        </section>
        <section className="card" style={{ marginTop: 24 }}>
          <h3>Gizlilik ve veri talepleri</h3>
          <p className="small">
            Kendi kayıtlarınızın bir kopyasını indirebilir veya kişisel verileriniz için başvuru
            yapabilirsiniz.
          </p>
          <a className="btn btn-outline" href="/api/data-export" download>
            <Download size={16} />
            Verilerimi indir
          </a>
          <DataRequestForm />
          <div className="notice">
            <Info size={16} />
            <p>
              Silme talepleri, kimlik doğrulaması ve yasal saklama yükümlülükleri bakımından
              yönetici tarafından incelenir. Kayıtlar otomatik olarak silinmez.
            </p>
          </div>
          {p.dataRequests.length > 0 && (
            <>
              <h3>Başvurularınız</h3>
              {p.dataRequests.map((r) => (
                <div className="content-record" key={r.id}>
                  <div>
                    <h3>
                      {
                        (
                          {
                            ACCESS: "Veriye erişim",
                            CORRECTION: "Düzeltme",
                            DELETION: "Silme",
                          } as Record<string, string>
                        )[r.type]
                      }
                    </h3>
                    <p>
                      {r.status === "PENDING"
                        ? "İnceleme bekliyor"
                        : r.status === "REVIEWING"
                          ? "İnceleniyor"
                          : r.status === "RESOLVED"
                            ? "Sonuçlandı"
                            : "Olumsuz sonuçlandı"}
                    </p>
                    {r.resolution && <p>{r.resolution}</p>}
                  </div>
                </div>
              ))}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
function DataRequestForm() {
  const [busy, setBusy] = useState(false),
    toast = useToast(),
    router = useRouter();
  return (
    <form
      method="post"
      style={{ marginTop: 25 }}
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        setBusy(true);
        try {
          await api("/api/data-requests", Object.fromEntries(f));
          toast("Veri talebiniz kaydedildi.");
          form.reset();
          router.refresh();
        } catch (e) {
          toast((e as Error).message, true);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="field">
        <label htmlFor="request-type">Başvuru türü</label>
        <select id="request-type" name="type">
          <option value="ACCESS">Verilerime erişim</option>
          <option value="CORRECTION">Verilerimin düzeltilmesi</option>
          <option value="DELETION">Verilerimin silinmesi</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="request-details">Açıklama (isteğe bağlı)</label>
        <textarea
          id="request-details"
          name="details"
          maxLength={2000}
          placeholder="Sağlık bilgisi paylaşmayın."
        />
      </div>
      <Button variant="outline" loading={busy} type="submit">
        Başvuruyu ilet
      </Button>
    </form>
  );
}
