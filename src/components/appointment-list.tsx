"use client";
import { useState } from "react";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Badge, EmptyState } from "./ui";
import { formatDate, formatTime, statusLabels } from "@/lib/i18n";
export type AppointmentRow = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  service: { name: string };
  client?: { name: string; email: string };
  payment?: { status: string } | null;
};
export function AppointmentList({
  appointments,
  admin = false,
  compact = false,
}: {
  appointments: AppointmentRow[];
  admin?: boolean;
  compact?: boolean;
}) {
  const [filter, setFilter] = useState("all"),
    [query, setQuery] = useState("");
  const root = admin ? "/yonetim" : "/panel";
  const rows = appointments.filter(
    (a) =>
      (filter === "all" || a.status === filter) &&
      (a.service.name + " " + (a.client?.name || "") + " " + (a.client?.email || ""))
        .toLocaleLowerCase("tr-TR")
        .includes(query.toLocaleLowerCase("tr-TR")),
  );
  return (
    <>
      {!compact && (
        <div className="list-toolbar">
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={admin ? "Ad, e-posta veya görüşme türü ara…" : "Görüşme türü ara…"}
            aria-label="Randevularda ara"
          />
          <select
            className="input"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Randevu durumu"
          >
            <option value="all">Tüm durumlar</option>
            {[
              "PENDING_APPROVAL",
              "ALTERNATIVE_PROPOSED",
              "AWAITING_PAYMENT",
              "CONFIRMED",
              "IN_PROGRESS",
              "COMPLETED",
              "CANCELLED",
              "REJECTED",
              "EXPIRED",
              "NO_SHOW",
            ].map((s) => (
              <option key={s} value={s}>
                {statusLabels[s]}
              </option>
            ))}
          </select>
        </div>
      )}
      {rows.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{admin ? "Danışan / görüşme" : "Görüşme"}</th>
                <th>Tarih ve saat</th>
                <th>Durum</th>
                <th>
                  <span className="sr-only">Ayrıntılar</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="appointment-title-cell">
                      <div className="date-tile">
                        <strong>{formatDate(a.startsAt, { day: "numeric" })}</strong>
                        <span>{formatDate(a.startsAt, { month: "short" })}</span>
                      </div>
                      <div>
                        <strong>{admin ? a.client?.name : a.service.name}</strong>
                        <small>{admin ? a.service.name : "Online görüşme"}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong>{formatDate(a.startsAt, { day: "numeric", month: "short" })}</strong>
                    <small>
                      {formatTime(a.startsAt)} – {formatTime(a.endsAt)}
                    </small>
                  </td>
                  <td>
                    <Badge status={a.status}>{statusLabels[a.status]}</Badge>
                  </td>
                  <td>
                    <Link className="table-action" href={`${root}/randevular/${a.id}`}>
                      Ayrıntılar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={<CalendarDays size={24} />}
          title="Görüntülenecek randevu yok"
          description={
            query || filter !== "all"
              ? "Arama veya filtre seçiminizi değiştirebilirsiniz."
              : "Yeni bir randevu oluşturduğunuzda burada görüntülenecek."
          }
        >
          {!admin && (
            <Link href="/randevu" className="btn btn-outline">
              Randevu oluştur
            </Link>
          )}
        </EmptyState>
      )}
    </>
  );
}
