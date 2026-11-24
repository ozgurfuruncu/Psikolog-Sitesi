import { pageUser } from "@/lib/guards";
import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/db";
import { isDemo } from "@/lib/env";
import { getSettings } from "@/lib/appointments";
export const dynamic = "force-dynamic";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await pageUser(true);
  const unread = await db.notification.count({ where: { userId: user.id, readAt: null } });
  const settings = await getSettings();
  return (
    <AppShell user={user} admin demo={isDemo()} unread={unread} siteName={settings.siteName}>
      {children}
    </AppShell>
  );
}
