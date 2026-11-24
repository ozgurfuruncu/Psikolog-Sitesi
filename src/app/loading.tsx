export default function Loading() {
  return (
    <main id="main" className="container page-space" aria-label="Sayfa yükleniyor">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-line" />
      <div className="grid-3">
        {[1, 2, 3].map((i) => (
          <div className="skeleton skeleton-card" key={i} />
        ))}
      </div>
      <span className="sr-only">Yükleniyor…</span>
    </main>
  );
}
