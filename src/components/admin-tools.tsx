"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, api, useToast } from "./ui";
export function PrepareReviewSession({ appointmentId }: { appointmentId: string }) {
  const [busy, setBusy] = useState(false),
    toast = useToast(),
    router = useRouter();
  return (
    <Button
      variant="outline"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await api("/api/admin/review-session", { appointmentId });
          toast("Kurgusal görüşmenin saati şimdiye alındı. Demo odası hazır.");
          router.refresh();
        } catch (error) {
          toast((error as Error).message, true);
        } finally {
          setBusy(false);
        }
      }}
    >
      Demo odasını şimdi hazırla
    </Button>
  );
}
export function RunJobsButton() {
  const [busy, setBusy] = useState(false),
    toast = useToast(),
    router = useRouter();
  return (
    <Button
      variant="outline"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await api("/api/admin/run-jobs", {});
          toast("Bildirim ve süre kontrolleri çalıştırıldı.");
          router.refresh();
        } catch (e) {
          toast((e as Error).message, true);
        } finally {
          setBusy(false);
        }
      }}
    >
      Bildirim kuyruğunu şimdi işle
    </Button>
  );
}
export function BlockTimeForm() {
  const [busy, setBusy] = useState(false),
    toast = useToast(),
    router = useRouter();
  return (
    <form
      method="post"
      className="card"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        try {
          await api("/api/admin/blocks", {
            startsAt: new Date(String(f.get("startsAt")) + ":00+03:00").toISOString(),
            endsAt: new Date(String(f.get("endsAt")) + ":00+03:00").toISOString(),
            reason: f.get("reason"),
          });
          toast("Kapalı zaman eklendi.");
          router.refresh();
        } catch (e) {
          toast((e as Error).message, true);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>Tatil veya kapalı zaman ekleyin</h3>
      <div className="field">
        <label htmlFor="block-start">Başlangıç (İstanbul)</label>
        <input id="block-start" type="datetime-local" name="startsAt" required />
      </div>
      <div className="field">
        <label htmlFor="block-end">Bitiş (İstanbul)</label>
        <input id="block-end" type="datetime-local" name="endsAt" required />
      </div>
      <div className="field">
        <label htmlFor="block-reason">Açıklama (yalnızca yöneticiye görünür)</label>
        <input
          id="block-reason"
          name="reason"
          required
          maxLength={200}
          placeholder="Örn. resmî tatil"
        />
      </div>
      <Button type="submit" loading={busy}>
        Zaman aralığını kapat
      </Button>
    </form>
  );
}
export function RemoveBlock({ id }: { id: string }) {
  const toast = useToast(),
    router = useRouter();
  return (
    <Button
      variant="outline"
      className="btn-sm"
      onClick={async () => {
        try {
          await api("/api/admin/blocks", { id }, "DELETE");
          router.refresh();
        } catch (e) {
          toast((e as Error).message, true);
        }
      }}
    >
      Kaldır
    </Button>
  );
}
export function SupportAction({ id, status }: { id: string; status: string }) {
  const toast = useToast(),
    router = useRouter();
  return (
    <Button
      variant="outline"
      className="btn-sm"
      onClick={async () => {
        try {
          await api("/api/admin/support", { id, status: status === "OPEN" ? "CLOSED" : "OPEN" });
          router.refresh();
        } catch (e) {
          toast((e as Error).message, true);
        }
      }}
    >
      {status === "OPEN" ? "Çözüldü işaretle" : "Yeniden aç"}
    </Button>
  );
}
export function DataRequestAction({ id }: { id: string }) {
  const [busy, setBusy] = useState(false),
    toast = useToast(),
    router = useRouter();
  return (
    <form
      method="post"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        try {
          await api("/api/admin/data-requests", {
            id,
            status: f.get("status"),
            resolution: f.get("resolution"),
          });
          router.refresh();
          toast("Başvuru durumu güncellendi.");
        } catch (e) {
          toast((e as Error).message, true);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="field">
        <label htmlFor={`request-status-${id}`}>İnceleme sonucu</label>
        <select id={`request-status-${id}`} name="status">
          <option value="REVIEWING">İnceleniyor</option>
          <option value="RESOLVED">Sonuçlandı</option>
          <option value="REJECTED">Olumsuz sonuçlandı</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor={`request-resolution-${id}`}>Yanıt / uygulanan işlem</label>
        <textarea
          id={`request-resolution-${id}`}
          name="resolution"
          required
          minLength={5}
          maxLength={3000}
        />
      </div>
      <Button variant="outline" loading={busy} type="submit">
        Başvuruyu güncelle
      </Button>
    </form>
  );
}
export function ProfilePhotoUpload() {
  const [busy, setBusy] = useState(false),
    toast = useToast(),
    router = useRouter();
  return (
    <form
      method="post"
      className="card"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        try {
          const response = await fetch("/api/files", { method: "POST", body: f });
          const file = await response.json();
          if (!response.ok) throw new Error(file.error);
          await api("/api/admin/profile-photo", { fileId: file.id });
          toast("Profil fotoğrafı güncellendi.");
          router.refresh();
        } catch (e) {
          toast((e as Error).message, true);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>Profil fotoğrafı</h3>
      <p className="small">
        Yalnızca uzmanın yayın izni bulunan gerçek fotoğrafını yükleyin. Temsili kişi fotoğraflarını
        uzman kimliği olarak kullanmayın.
      </p>
      <div className="field">
        <label htmlFor="profile-photo">JPEG veya PNG (en çok 5 MB)</label>
        <input id="profile-photo" name="file" type="file" accept="image/png,image/jpeg" required />
      </div>
      <Button type="submit" loading={busy}>
        Fotoğrafı yükle
      </Button>
    </form>
  );
}
export function BrandingUpload({
  field,
  title,
}: {
  field: "logoFileId" | "faviconFileId";
  title: string;
}) {
  const [busy, setBusy] = useState(false),
    toast = useToast(),
    router = useRouter();
  return (
    <form
      method="post"
      className="card"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        try {
          const response = await fetch("/api/files", {
            method: "POST",
            body: new FormData(event.currentTarget),
          });
          const file = await response.json();
          if (!response.ok) throw new Error(file.error);
          await api("/api/admin/branding", { field, fileId: file.id });
          toast(`${title} kaydedildi.`);
          router.refresh();
        } catch (error) {
          toast((error as Error).message, true);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>{title}</h3>
      <div className="field">
        <label htmlFor={field}>PNG veya JPEG (en çok 5 MB)</label>
        <input id={field} type="file" name="file" accept="image/png,image/jpeg" required />
      </div>
      <div className="button-row">
        <Button type="submit" loading={busy}>
          Görseli yükle
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await api("/api/admin/branding", { field, fileId: null });
              toast("Görsel kaldırıldı.");
              router.refresh();
            } catch (error) {
              toast((error as Error).message, true);
            } finally {
              setBusy(false);
            }
          }}
        >
          Görseli kaldır
        </Button>
      </div>
    </form>
  );
}
