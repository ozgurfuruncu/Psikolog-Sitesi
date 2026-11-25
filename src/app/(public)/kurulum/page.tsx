import { notFound } from "next/navigation";
import { setupAvailable } from "@/lib/setup";
import { SetupForm } from "@/components/setup-form";
export const dynamic = "force-dynamic";
export const metadata = { title: "İlk kurulum", robots: { index: false, follow: false } };
export default async function SetupPage() {
  if (!(await setupAvailable())) notFound();
  return (
    <div className="container page-space" style={{ maxWidth: 680 }}>
      <h1>İlk yönetici kurulumu</h1>
      <p>
        Yayın hesabınızdaki kurulum anahtarıyla ilk yönetici hesabınızı oluşturun. Bu ekran ilk
        kurulumdan sonra kapanır.
      </p>
      <SetupForm />
    </div>
  );
}
