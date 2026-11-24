import { AuthForm } from "@/components/auth-form";
import { isDemo } from "@/lib/env";
export const metadata = { title: "Şifremi unuttum" };
export default function Forgot() {
  return <AuthForm mode="forgot" demo={isDemo()} />;
}
