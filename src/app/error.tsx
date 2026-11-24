"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="error-screen">
      <p className="eyebrow">BİR SORUN OLUŞTU</p>
      <h1>Biraz ara verip tekrar deneyelim.</h1>
      <p>Sayfa şu anda yüklenemedi. Bağlantınızı kontrol edin veya daha sonra tekrar deneyin.</p>
      <button className="btn btn-primary" onClick={reset}>
        Tekrar dene
      </button>
    </main>
  );
}
