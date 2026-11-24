import { AuthForm } from "@/components/auth-form";
import { isDemo } from "@/lib/env";
export const metadata = { title: "Hesap oluştur" };
export default function Register() {
  return <AuthForm mode="register" demo={isDemo()} />;
}
