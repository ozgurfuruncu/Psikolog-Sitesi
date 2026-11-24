import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Şifre yenile" };
export default async function Reset({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <AuthForm mode="reset" token={token} />;
}
