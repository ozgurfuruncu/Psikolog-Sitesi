"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Modal, api, useToast } from "./ui";
import { Video, Wallet, MessageSquare, Download, Info } from "lucide-react";
import { formatDate } from "@/lib/i18n";
type ActionAppointment = {
  id: string;
  status: string;
  startsAt: string;
  endsAt: string;
  payment: { id: string; status: string } | null;
  feedback: unknown;
};
export function AppointmentActions({
  appointment: a,
  admin = false,
}: {
  appointment: ActionAppointment;
  admin?: boolean;
}) {
  const [modal, setModal] = useState<string | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [date, setDate] = useState(""),
    router = useRouter(),
    toast = useToast();
  const active = [
    "PENDING_APPROVAL",
    "ALTERNATIVE_PROPOSED",
    "AWAITING_PAYMENT",
    "CONFIRMED",
    "IN_PROGRESS",
  ].includes(a.status);
  async function execute(action: string) {
    setLoading(true);
    setError("");
    try {
      await api(`/api/appointments/${a.id}`, {
        action,
        ...(action === "propose" ? { startsAt: new Date(date + ":00+03:00").toISOString() } : {}),
      });
      toast("Randevu güncellendi.");
      setModal(null);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  const actionButton = (
    action: string,
    label: string,
    variant: "default" | "outline" | "danger" = "outline",
  ) => (
    <Button
      key={action}
      variant={variant}
      onClick={() => {
        setError("");
        setModal(action);
      }}
    >
      {label}
    </Button>
  );
  return (
    <>
      <div className="action-stack">
        {admin ? (
          <>
            {a.status === "PENDING_APPROVAL" &&
              actionButton("approve", "Randevuyu onayla", "default")}
            {["PENDING_APPROVAL", "ALTERNATIVE_PROPOSED"].includes(a.status) &&
              actionButton("reject", "Talebi reddet", "danger")}
            {a.status === "CONFIRMED" && actionButton("start", "Görüşmeyi başlat", "default")}
            {["CONFIRMED", "IN_PROGRESS"].includes(a.status) && (
              <>
                {actionButton("complete", "Görüşmeyi tamamla")}
                {actionButton("no-show", "Katılım olmadı")}
              </>
            )}
          </>
        ) : (
          <>
            {a.status === "ALTERNATIVE_PROPOSED" && (
              <>
                {actionButton("accept", "Önerilen saati kabul et", "default")}
                {actionButton("decline", "Önerilen saati reddet")}
              </>
            )}
            {a.status === "AWAITING_PAYMENT" && (
              <Link className="btn btn-primary" href={`/panel/odemeler?payment=${a.payment?.id}`}>
                <Wallet size={16} />
                Ödeme adımına geç
              </Link>
            )}
            {a.status === "COMPLETED" && !a.feedback && (
              <Link
                href={`/panel/degerlendirmeler?appointment=${a.id}`}
                className="btn btn-primary"
              >
                <MessageSquare size={16} />
                Özel değerlendirme yap
              </Link>
            )}
          </>
        )}
        {["CONFIRMED", "IN_PROGRESS"].includes(a.status) && (
          <>
            <Link
              href={`${admin ? "/yonetim" : "/panel"}/gorusme/${a.id}`}
              className="btn btn-outline"
            >
              <Video size={16} />
              Görüşme alanını aç
            </Link>
            <a className="btn btn-ghost" href={`/api/appointments/${a.id}/ics`}>
              <Download size={15} />
              Takvime ekle (.ics)
            </a>
          </>
        )}
        {["PENDING_APPROVAL", "ALTERNATIVE_PROPOSED", "AWAITING_PAYMENT", "CONFIRMED"].includes(
          a.status,
        ) && actionButton("propose", admin ? "Alternatif saat öner" : "Saat değişikliği iste")}
        {active && actionButton("cancel", "Randevuyu iptal et", "danger")}
      </div>
      <Modal
        open={!!modal}
        onOpenChange={(o) => !o && setModal(null)}
        title={
          modal === "propose"
            ? admin
              ? "Yeni bir saat önerin"
              : "Saat değişikliği talebi"
            : "İşlemi onaylayın"
        }
        description={
          modal === "propose"
            ? "Yeni saat Türkiye saatine göre işlenir. Çalışma aralığı ve çakışma sunucuda kontrol edilir."
            : "Randevunuzun durumu değişecektir. Bilgileri kontrol ederek devam edin."
        }
      >
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        {modal === "propose" ? (
          <>
            <div className="field">
              <label htmlFor="alternative-date">Yeni tarih ve saat (İstanbul)</label>
              <input
                id="alternative-date"
                type="datetime-local"
                value={date}
                step={1800}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="notice">
              <Info size={16} />
              <p>
                Yeni talep, mevcut saatinizi bırakır ve yeni saati geçici ayırır. Saatler 30
                dakikalık aralıklarda seçilir.{" "}
                {admin
                  ? "Danışan yeni saati kabul etmelidir."
                  : "Uzman yeni talebinizi değerlendirecektir."}
              </p>
            </div>
          </>
        ) : (
          <p className="small">
            {formatDate(a.startsAt)} tarihli randevu için{" "}
            <strong>
              {
                (
                  {
                    approve: "onaylama",
                    reject: "reddetme",
                    accept: "yeni saati kabul etme",
                    decline: "yeni saati reddetme",
                    cancel: "iptal etme",
                    complete: "tamamlama",
                    start: "başlatma",
                    "no-show": "katılım olmadığını belirtme",
                  } as Record<string, string>
                )[modal || ""]
              }
            </strong>{" "}
            işlemini onaylıyor musunuz?
          </p>
        )}
        <div className="modal-actions">
          <Button variant="outline" onClick={() => setModal(null)}>
            Vazgeç
          </Button>
          <Button
            loading={loading}
            disabled={modal === "propose" && !date}
            onClick={() => modal && execute(modal)}
          >
            Onayla
          </Button>
        </div>
      </Modal>
    </>
  );
}
