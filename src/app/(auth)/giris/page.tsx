import { AuthForm } from "@/components/auth-form";
import { isDemo } from "@/lib/env";
export const metadata = { title: "Danışan girişi" };
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string }>;
}) {
  const { verified } = await searchParams;
  return <AuthForm mode="login" demo={isDemo()} verified={verified === "1"} />;
}
