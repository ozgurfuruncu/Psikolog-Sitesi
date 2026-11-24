"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, Button, useToast } from "./ui";
const questions = [
  ["overall", "Görüşme deneyiminiz genel olarak nasıldı?"],
  ["communication", "Kendinizi ifade ederken ne kadar rahat hissettiniz?"],
  ["booking", "Randevu sürecini ne kadar kolay buldunuz?"],
  ["technical", "Görüşmenin teknik kalitesi nasıldı?"],
];
export function FeedbackForm({ appointmentId }: { appointmentId: string }) {
  const [ratings, setRatings] = useState<Record<string, number>>({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    toast = useToast(),
    router = useRouter();
  return (
    <form
      method="post"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        setError("");
        try {
          await api(`/api/appointments/${appointmentId}/feedback`, {
            ...ratings,
            comment: f.get("comment"),
          });
          toast("Özel değerlendirmeniz kaydedildi. Paylaştığınız için teşekkür ederiz.");
          router.refresh();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="small">
        Bu form isteğe bağlıdır. Yanıtlarınız yalnızca siz ve yetkili uzman tarafından görülebilir.
        Görüşme içeriği veya sağlık bilgisi paylaşmayın.
      </p>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      {questions.map(([key, label]) => (
        <fieldset className="rating-row" key={key} style={{ border: 0, padding: 0 }}>
          <legend style={{ fontSize: ".85rem", marginBottom: 10 }}>{label}</legend>
          <div className="rating-buttons" role="radiogroup" aria-label={label}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                type="button"
                role="radio"
                aria-checked={ratings[key] === n}
                className={`rating-button ${ratings[key] === n ? "selected" : ""}`}
                key={n}
                onClick={() => setRatings({ ...ratings, [key]: n })}
                aria-label={`${n} / 5`}
              >
                {n}
              </button>
            ))}
          </div>
          <span className="muted" style={{ fontSize: ".68rem" }}>
            1: Çok düşük · 5: Çok iyi
          </span>
        </fieldset>
      ))}
      <div className="field">
        <label htmlFor="feedback-comment">
          İyileştirebileceğimiz bir şey var mı? (isteğe bağlı)
        </label>
        <textarea id="feedback-comment" name="comment" maxLength={2000} />
      </div>
      <Button type="submit" loading={busy} disabled={Object.keys(ratings).length !== 4}>
        Özel değerlendirmeyi gönder
      </Button>
    </form>
  );
}
