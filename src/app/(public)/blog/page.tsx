import Link from "next/link";
import Image from "next/image";
import { BookOpen, Search } from "lucide-react";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/i18n";
import { signedFileUrl } from "@/lib/files";
import { EmptyState } from "@/components/ui";
import { getSite } from "@/lib/site";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
export const metadata = { title: "Yazılar" };
export default async function Blog({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;
  if (!(await getSite()).showBlog) notFound();
  const [posts, categories] = await Promise.all([
    db.blogPost.findMany({
      where: {
        published: true,
        reviewed: true,
        ...(q
          ? {
              OR: [
                { title: { contains: q.slice(0, 200), mode: "insensitive" } },
                { excerpt: { contains: q.slice(0, 200), mode: "insensitive" } },
              ],
            }
          : {}),
        ...(category ? { categoryId: category } : {}),
      },
      include: { category: true },
      orderBy: { publishedAt: "desc" },
      take: 50,
    }),
    db.blogCategory.findMany(),
  ]);
  return (
    <div className="container page-space">
      <div className="page-intro">
        <p className="eyebrow">BİLGİ VE PAYLAŞIM</p>
        <h1>Okumaya bir ara.</h1>
        <p>
          Platform rehberleri ve uzman incelemesinden geçen bilgilendirici içerikler. Buradaki
          yazılar kişiye özel değerlendirme veya hizmet yerine geçmez.
        </p>
      </div>
      <form className="list-toolbar" action="/blog">
        <input
          className="input"
          name="q"
          placeholder="Yazılarda ara…"
          aria-label="Yazılarda ara"
          defaultValue={q}
          maxLength={200}
        />
        <select
          className="input"
          name="category"
          defaultValue={category || ""}
          aria-label="Kategori"
        >
          <option value="">Tüm kategoriler</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button className="btn btn-primary">
          <Search size={16} />
          Ara
        </button>
      </form>
      {posts.length ? (
        <div className="grid-3">
          {posts.map((post, i) => (
            <Link className="blog-card" href={`/blog/${post.slug}`} key={post.id}>
              <div className={`blog-art blog-art-${i % 3}`}>
                {post.imageFileId ? (
                  <Image
                    src={signedFileUrl(post.imageFileId)}
                    alt=""
                    width={600}
                    height={300}
                    unoptimized
                  />
                ) : i === 0 ? (
                  <Image src="/images/forest.jpg" alt="Yeşil orman" width={600} height={300} />
                ) : (
                  <BookOpen size={50} strokeWidth={0.8} />
                )}
              </div>
              <div className="blog-body">
                <span className="blog-category">{post.category?.name || "Rehber"}</span>
                <h3>{post.title}</h3>
                <p>{post.excerpt}</p>
                <time className="blog-date">{formatDate(post.publishedAt || post.createdAt)}</time>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<BookOpen />}
          title="Henüz bir yazı bulunamadı"
          description="Arama veya kategori seçimini değiştirerek tekrar deneyebilirsiniz."
        />
      )}
    </div>
  );
}
