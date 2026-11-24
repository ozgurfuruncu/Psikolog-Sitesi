"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, Info } from "lucide-react";
import { api, Button, Badge, Modal, EmptyState, useToast } from "./ui";
import { formatDate, money, statusLabels } from "@/lib/i18n";
type Payment = {
  id: string;
  status: string;
  amountKurus: number;
  provider: string;
  createdAt: string;
  appointment: {
    id: string;
    status: string;
    startsAt: string;
    service: { name: string };
    client?: { name: string };
  };
  refunds: Array<{ id: string; status: string; amountKurus: number }>;
};
export function PaymentList({
  payments,
  admin = false,
  demo = false,
}: {
  payments: Payment[];
  admin?: boolean;
  demo?: boolean;
}) {
  const [selected, setSelected] = useState<Payment | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [receipt, setReceipt] = useState<Payment | null>(null),
    toast = useToast(),
    router = useRouter();
  async function pay(outcome: string) {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/payments/${selected.id}/mock`, { outcome });
      toast(
        outcome === "PAID"
          ? "Test ödemesi doğrulandı. Randevunuz kesinleşti."
          : "Başarısız test ödemesi kaydedildi. Tekrar deneyebilirsiniz.",
      );
      setSelected(null);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {demo && (
        <div className="notice">
          <Info size={18} />
          <p>
            Geliştirme ödemeleri ve iadeleridir. Gerçek para tahsil edilmez, kart bilgisi istenmez.
            Örnek fiyatlar gerçek hizmet teklifi değildir.
          </p>
        </div>
      )}
      {payments.length ? (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Görüşme</th>
                  <th>Tutar</th>
                  <th>Durum</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>
                        {admin ? p.appointment.client?.name : p.appointment.service.name}
                      </strong>
                      <small>
                        {formatDate(p.appointment.startsAt, {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </small>
                    </td>
                    <td>{p.status === "NOT_REQUIRED" ? "–" : money(p.amountKurus)}</td>
                    <td>
                      <Badge status={p.status}>{statusLabels[p.status]}</Badge>
                      {p.refunds.map((r) => (
                        <div
                          className="small muted"
                          key={r.id}
                          style={{ fontSize: ".65rem", marginTop: 5 }}
                        >
                          İade: {r.status === "REFUNDED" ? "Tamamlandı" : "İşlem bekliyor"}
                        </div>
                      ))}
                    </td>
                    <td>
                      <div className="button-row">
                        {!admin &&
                          p.appointment.status === "AWAITING_PAYMENT" &&
                          ["PENDING", "FAILED"].includes(p.status) && (
                            <Button
                              className="btn-sm"
                              onClick={() => {
                                setSelected(p);
                                setError("");
                              }}
                            >
                              {p.status === "FAILED" ? "Tekrar dene" : "Ödeme yap"}
                            </Button>
                          )}
                        {["PAID", "REFUNDED", "REFUND_PENDING"].includes(p.status) && (
                          <button className="table-action" onClick={() => setReceipt(p)}>
                            İşlem kaydı
                          </button>
                        )}
                        {admin &&
                          demo &&
                          p.provider === "mock" &&
                          p.refunds
                            .filter((r) => r.status === "PENDING")
                            .map((r) => (
                              <Button
                                variant="outline"
                                className="btn-sm"
                                key={r.id}
                                onClick={async () => {
                                  try {
                                    await api("/api/admin/refunds", { id: r.id });
                                    toast("Geliştirme iadesi tamamlandı.");
                                    router.refresh();
                                  } catch (e) {
                                    toast((e as Error).message, true);
                                  }
                                }}
                              >
                                Test iadesini tamamla
                              </Button>
                            ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={<Wallet />}
            title="Henüz ödeme kaydınız yok"
            description="Uzman onayından sonra ödeme gerektiren randevular burada görüntülenecek."
          />
        </div>
      )}
      <Modal
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title={selected?.provider === "iyzico" ? "iyzico sandbox ödemesi" : "Geliştirme ödemesi"}
        description={
          selected?.provider === "iyzico"
            ? "Yalnızca sağlayıcının test bilgilerini kullanın. Kart bilgileri sağlayıcının kendi sayfasında girilir."
            : "Bu ekran gerçek bir ödeme veya iyzico sandbox işlemi değildir. Kart bilgisi girmeyin."
        }
      >
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <div className="booking-summary-row">
          <span>Görüşme</span>
          <strong>{selected?.appointment.service.name}</strong>
        </div>
        <div className="booking-summary-row">
          <span>Test tutarı</span>
          <strong>{selected && money(selected.amountKurus)}</strong>
        </div>
        {selected?.provider === "iyzico" ? (
          <form
            method="post"
            onSubmit={async (e) => {
              e.preventDefault();
              const values = new FormData(e.currentTarget);
              setBusy(true);
              setError("");
              try {
                const result = await api<{ url: string }>(`/api/payments/${selected.id}/checkout`, {
                  identityNumber: values.get("identityNumber"),
                  address: values.get("address"),
                  city: values.get("city"),
                });
                window.location.assign(result.url);
              } catch (error) {
                setError((error as Error).message);
                setBusy(false);
              }
            }}
          >
            <div className="notice">
              <Info size={17} />
              <p>
                Bu alanlar iyzico sandbox tarafından istenir. Gerçek kimlik veya adres kullanmayın.
                Test alıcı bilgileri yalnızca ödeme sağlayıcısına iletilir; profilinize kaydedilmez.
              </p>
            </div>
            <div className="field">
              <label htmlFor="buyer-identity">Sandbox test kimlik numarası</label>
              <input
                id="buyer-identity"
                name="identityNumber"
                inputMode="numeric"
                pattern="[0-9]{11}"
                maxLength={11}
                required
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label htmlFor="buyer-city">Test şehri</label>
              <input id="buyer-city" name="city" maxLength={100} required autoComplete="off" />
            </div>
            <div className="field">
              <label htmlFor="buyer-address">Test adresi</label>
              <textarea
                id="buyer-address"
                name="address"
                maxLength={300}
                required
                autoComplete="off"
              />
            </div>
            <Button type="submit" loading={busy}>
              iyzico sandbox sayfasını aç
            </Button>
          </form>
        ) : (
          <>
            <div className="notice">
              <Info size={17} />
              <p>
                Bir test sonucu seçin. Başarılı test ödemesi randevunuzu kesinleştirir; başarısız
                testte yeniden deneyebilirsiniz. Gerçek bir ücret tahsil edilmez.
              </p>
            </div>
            <div className="modal-actions">
              <Button variant="outline" loading={busy} onClick={() => pay("FAILED")}>
                Başarısızlığı dene
              </Button>
              <Button loading={busy} onClick={() => pay("PAID")}>
                Test ödemesini tamamla
              </Button>
            </div>
          </>
        )}
      </Modal>
      <Modal
        open={!!receipt}
        onOpenChange={(o) => !o && setReceipt(null)}
        title="Ödeme işlem kaydı"
        description="Bu ekran mali belge veya fatura yerine geçmez."
      >
        <div className="booking-summary-row">
          <span>İşlem numarası</span>
          <code style={{ overflowWrap: "anywhere", fontSize: ".8rem" }}>{receipt?.id}</code>
        </div>
        <div className="booking-summary-row">
          <span>Tutar</span>
          <strong>{receipt && money(receipt.amountKurus)}</strong>
        </div>
        <div className="booking-summary-row">
          <span>Durum</span>
          <span>{receipt && statusLabels[receipt.status]}</span>
        </div>
        <div className="booking-summary-row">
          <span>Sağlayıcı</span>
          <span>{receipt?.provider === "mock" ? "Geliştirme simülasyonu" : "iyzico sandbox"}</span>
        </div>
      </Modal>
    </>
  );
}
