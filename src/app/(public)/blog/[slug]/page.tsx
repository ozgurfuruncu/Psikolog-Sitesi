import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@/lib/i18n";
import { signedFileUrl } from "@/lib/files";
import { getSite } from "@/lib/site";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await db.blogPost.findFirst({ where: { slug, published: true, reviewed: true } });
  return { title: p?.seoTitle || p?.title || "Yazı", description: p?.seoDescription || p?.excerpt };
}
export default async function Article({ params }: { params: Promise<{ slug: string }> }) {
  if (!(await getSite()).showBlog) notFound();
  const { slug } = await params;
  const p = await db.blogPost.findFirst({
    where: { slug, published: true, reviewed: true },
    include: { category: true },
  });
  if (!p) notFound();
  return (
    <div className="container page-space">
      <div className="breadcrumbs">
        <Link href="/blog">Yazılar</Link>
        <span>/</span>
        <span>{p.category?.name || "Rehber"}</span>
      </div>
      <article className="prose">
        <p className="eyebrow">{p.category?.name || "PLATFORM REHBERİ"}</p>
        <h1 style={{ fontSize: "clamp(2.3rem,4vw,3.5rem)" }}>{p.title}</h1>
        <p className="small">{formatDate(p.publishedAt || p.createdAt)}</p>
        {p.imageFileId && (
          <Image
            src={signedFileUrl(p.imageFileId)}
            alt=""
            width={900}
            height={500}
            unoptimized
            style={{ borderRadius: 12, marginBottom: 30 }}
          />
        )}
        <p style={{ fontSize: "1.1rem" }}>{p.excerpt}</p>
        <p>{p.content}</p>
        <div className="notice">
          Bu içerik bilgilendirme amaçlıdır; kişiye özel profesyonel değerlendirme yerine geçmez.
        </div>
        <Link href="/blog" className="btn btn-outline">
          Tüm yazılara dön
        </Link>
      </article>
    </div>
  );
}
