"use client";
import { useState } from "react";
import { Award, ExternalLink, Eye } from "lucide-react";
import Image from "next/image";
import { Modal, Button, EmptyState } from "./ui";
type Certificate = {
  id: string;
  title: string;
  institution: string;
  description: string;
  completedAt: string | null;
  url: string | null;
  mimeType: string | null;
  verificationUrl: string | null;
  isPlaceholder: boolean;
};
export function CertificateGallery({ items }: { items: Certificate[] }) {
  const [selected, setSelected] = useState<Certificate | null>(null);
  return (
    <>
      {!items.length ? (
        <EmptyState
          icon={<Award size={25} />}
          title="Henüz yayımlanan belge yok"
          description="Uzman tarafından paylaşılmasına onay verilen belgeler burada yer alacak."
        />
      ) : (
        <div className="grid-3">
          {items.map((item) => (
            <article key={item.id} className="card certificate-card">
              <div className="certificate-preview">
                <Award size={45} strokeWidth={0.8} />
                <span>
                  {item.isPlaceholder
                    ? "ÖRNEK BELGE · GERÇEK YETKİNLİK DEĞİLDİR"
                    : "BELGE ÖNİZLEMESİ"}
                </span>
              </div>
              <h3>{item.title}</h3>
              <p>
                {item.institution}
                {item.completedAt &&
                  ` · ${new Intl.DateTimeFormat("tr-TR", { year: "numeric" }).format(new Date(item.completedAt))}`}
              </p>
              <Button variant="outline" onClick={() => setSelected(item)}>
                <Eye size={16} />
                Belgeyi incele
              </Button>
            </article>
          ))}
        </div>
      )}
      <Modal
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        title={selected?.title || "Belge"}
        description="Belgeler bağımsız bir doğrulama sürecinden geçirilmemiştir."
      >
        {selected?.url ? (
          selected.mimeType === "application/pdf" ? (
            <object className="certificate-modal" data={selected.url} type="application/pdf">
              <a href={selected.url} target="_blank" rel="noreferrer">
                PDF dosyasını açın
              </a>
            </object>
          ) : (
            <Image
              className="certificate-modal"
              src={selected.url}
              width={800}
              height={1000}
              alt={selected.title}
              unoptimized
            />
          )
        ) : (
          <div className="certificate-placeholder">
            <Award size={60} strokeWidth={0.7} />
            <h3>Örnek belge alanı</h3>
            <p>
              Bu bir eğitim veya yetkinlik belgesi değildir. Gerçek belge, uzman tarafından
              yüklenecektir.
            </p>
          </div>
        )}
        <p className="small" style={{ marginTop: 20 }}>
          {selected?.description}
        </p>
        {selected?.verificationUrl && (
          <a
            className="btn btn-outline"
            href={selected.verificationUrl}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={15} />
            Kurumun doğrulama sayfası
          </a>
        )}
      </Modal>
    </>
  );
}
