import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="error-screen">
      <p className="eyebrow">404 · SAYFA BULUNAMADI</p>
      <h1>Biraz farklı bir yoldayız.</h1>
      <p>Aradığınız sayfa taşınmış veya kaldırılmış olabilir.</p>
      <Link href="/" className="btn btn-primary">
        Ana sayfaya dön
      </Link>
    </main>
  );
}
