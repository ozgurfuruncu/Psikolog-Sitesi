"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, Button } from "./ui";
export function SetupForm() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    router = useRouter();
  return (
    <form
      method="post"
      className="card"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setBusy(true);
        setError("");
        try {
          await api("/api/setup", Object.fromEntries(form));
          router.replace("/giris");
        } catch (error) {
          setError((error as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="field">
        <label htmlFor="setup-token">Kurulum anahtarı</label>
        <input
          id="setup-token"
          name="token"
          type="password"
          autoComplete="off"
          required
          maxLength={200}
        />
      </div>
      <div className="field">
        <label htmlFor="setup-name">Yönetici adı soyadı</label>
        <input id="setup-name" name="name" autoComplete="name" required maxLength={100} />
      </div>
      <div className="field">
        <label htmlFor="setup-email">Yönetici e-posta adresi</label>
        <input id="setup-email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="field">
        <label htmlFor="setup-password">Yönetici şifresi (en az 16 karakter)</label>
        <input
          id="setup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={16}
          maxLength={128}
          required
        />
      </div>
      <Button type="submit" loading={busy}>
        Yönetici hesabını oluştur
      </Button>
    </form>
  );
}
