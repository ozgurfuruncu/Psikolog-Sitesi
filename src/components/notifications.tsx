"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { Button, api, useToast, EmptyState } from "./ui";
import { formatDate } from "@/lib/i18n";
export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  readAt: string | null;
};
export function Notifications({
  items,
  compact = false,
}: {
  items: NotificationItem[];
  compact?: boolean;
}) {
  const router = useRouter(),
    toast = useToast();
  return (
    <>
      {!compact && items.some((i) => !i.readAt) && (
        <Button
          variant="outline"
          className="btn-sm"
          style={{ marginBottom: 25 }}
          onClick={async () => {
            try {
              await api("/api/notifications", {});
              router.refresh();
              toast("Bildirimler okundu olarak işaretlendi.");
            } catch (e) {
              toast((e as Error).message, true);
            }
          }}
        >
          <CheckCheck size={16} />
          Tümünü okundu işaretle
        </Button>
      )}
      {items.length ? (
        <div className="notification-list">
          {items.map((n) => (
            <div className="notification-item" key={n.id}>
              <span className="notification-symbol">
                <Bell size={15} strokeWidth={1.5} />
              </span>
              <div>
                <Link
                  href={n.href}
                  onClick={() => {
                    api(`/api/notifications/${n.id}`, {})
                      .then(() => router.refresh())
                      .catch(() => {});
                  }}
                >
                  <strong>
                    {n.title}
                    {!n.readAt && <span className="sr-only"> · Okunmadı</span>}
                  </strong>
                </Link>
                <p>{n.body}</p>
                <time>
                  {formatDate(n.createdAt, {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Bell />}
          title="Bildirimleriniz burada"
          description="Randevu ve hesabınızla ilgili gelişmeleri buradan takip edebilirsiniz."
        />
      )}
    </>
  );
}
