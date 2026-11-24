"use client";
import { useState } from "react";
import { Button, api, useToast } from "./ui";
export function ContactForm() {
  const [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [sent, setSent] = useState(false),
    toast = useToast();
  return sent ? (
    <div className="form-success" role="status">
      Mesajınız alındı. Hesap ve randevu konusundaki talebiniz incelenecektir.
    </div>
  ) : (
    <form
      method="post"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setLoading(true);
        setError("");
        try {
          await api("/api/support", Object.fromEntries(form));
          setSent(true);
          toast("Mesajınız alındı.");
        } catch (error) {
          setError((error as Error).message);
        } finally {
          setLoading(false);
        }
      }}
    >
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      <div className="field">
        <label htmlFor="contact-name">Adınız soyadınız</label>
        <input
          id="contact-name"
          name="name"
          required
          minLength={2}
          maxLength={100}
          autoComplete="name"
        />
      </div>
      <div className="field">
        <label htmlFor="contact-email">E-posta adresiniz</label>
        <input
          id="contact-email"
          type="email"
          name="email"
          required
          autoComplete="email"
          maxLength={254}
        />
      </div>
      <div className="field">
        <label htmlFor="contact-subject">Konu</label>
        <input
          id="contact-subject"
          name="subject"
          required
          minLength={3}
          maxLength={150}
          placeholder="Örn. randevu değişikliği"
        />
      </div>
      <div className="field">
        <label htmlFor="contact-message">Mesajınız</label>
        <textarea
          id="contact-message"
          name="message"
          required
          minLength={10}
          maxLength={3000}
          placeholder="Lütfen sağlık bilgisi veya özel görüşme içeriği paylaşmayın."
        />
      </div>
      <Button type="submit" loading={loading}>
        Mesajı gönder
      </Button>
    </form>
  );
}
