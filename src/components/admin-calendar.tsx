"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type AppointmentRow, AppointmentList } from "./appointment-list";
import { addDays, localDate, formatDate, formatTime } from "@/lib/i18n";
export function AdminCalendar({
  appointments,
  blocks,
}: {
  appointments: AppointmentRow[];
  blocks: Array<{ id: string; startsAt: string; endsAt: string; reason: string }>;
}) {
  const [date, setDate] = useState(localDate()),
    [view, setView] = useState("month");
  const parsed = new Date(date + "T12:00:00+03:00"),
    monthStart = localDate(new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), 1, 12)),
    weekday = new Date(monthStart + "T12:00:00+03:00").getUTCDay();
  const start = addDays(monthStart, -((weekday + 6) % 7));
  const weekStart = addDays(date, -((parsed.getUTCDay() + 6) % 7));
  const dates =
    view === "month"
      ? Array.from({ length: 42 }, (_, i) => addDays(start, i))
      : view === "week"
        ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
        : [date];
  function shift(direction: number) {
    if (view === "month") {
      setDate(
        localDate(new Date(parsed.getUTCFullYear(), parsed.getUTCMonth() + direction, 1, 12)),
      );
    } else setDate(addDays(date, direction * (view === "week" ? 7 : 1)));
  }
  return (
    <div className="card">
      <div className="calendar-toolbar">
        <div className="calendar-nav">
          <button className="icon-btn" aria-label="Önceki dönem" onClick={() => shift(-1)}>
            <ChevronLeft size={18} />
          </button>
          <h2>
            {formatDate(parsed, {
              ...(view === "day" ? { day: "numeric" as const } : {}),
              month: "long",
              year: "numeric",
            })}
          </h2>
          <button className="icon-btn" aria-label="Sonraki dönem" onClick={() => shift(1)}>
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="pill-tabs" style={{ margin: 0 }}>
          {[
            ["day", "Gün"],
            ["week", "Hafta"],
            ["month", "Ay"],
          ].map(([v, label]) => (
            <button
              className={`pill-tab ${v === view ? "active" : ""}`}
              key={v}
              onClick={() => setView(v)}
            >
              {label}
            </button>
          ))}
          <button className="pill-tab" onClick={() => setDate(localDate())}>
            Bugün
          </button>
        </div>
      </div>
      {view === "day" ? (
        <>
          <p className="small muted">
            {formatDate(parsed, { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <AppointmentList
            appointments={appointments.filter((a) => localDate(new Date(a.startsAt)) === date)}
            admin
            compact
          />
          {blocks
            .filter(
              (b) =>
                localDate(new Date(b.startsAt)) <= date && localDate(new Date(b.endsAt)) >= date,
            )
            .map((b) => (
              <div className="notice" key={b.id}>
                Kapalı zaman: {formatTime(b.startsAt)} – {formatTime(b.endsAt)} · {b.reason}
              </div>
            ))}
        </>
      ) : (
        <div className="calendar-outer">
          <div className="calendar-grid">
            {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((d) => (
              <div className="calendar-day-label" key={d}>
                {d}
              </div>
            ))}
            {dates.map((d) => (
              <div
                key={d}
                className={`calendar-day ${d.slice(5, 7) !== date.slice(5, 7) ? "outside" : ""} ${d === localDate() ? "today" : ""}`}
              >
                <button
                  className="calendar-date"
                  style={{ border: 0, cursor: "pointer" }}
                  aria-label={`${d} gününü görüntüle`}
                  onClick={() => {
                    setDate(d);
                    setView("day");
                  }}
                >
                  {Number(d.slice(-2))}
                </button>
                {appointments
                  .filter((a) => localDate(new Date(a.startsAt)) === d)
                  .map((a) => (
                    <Link
                      key={a.id}
                      href={`/yonetim/randevular/${a.id}`}
                      className={`calendar-event ${["PENDING_APPROVAL", "ALTERNATIVE_PROPOSED", "AWAITING_PAYMENT"].includes(a.status) ? "pending" : ["CANCELLED", "REJECTED", "EXPIRED"].includes(a.status) ? "cancelled" : ""}`}
                    >
                      <strong>{formatTime(a.startsAt)}</strong> {a.client?.name}
                      <span>{a.service.name}</span>
                    </Link>
                  ))}
                {blocks
                  .filter(
                    (b) =>
                      localDate(new Date(b.startsAt)) <= d && localDate(new Date(b.endsAt)) >= d,
                  )
                  .map((b) => (
                    <span className="calendar-event cancelled" key={b.id}>
                      Kapalı · {b.reason}
                    </span>
                  ))}
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="small muted" style={{ marginTop: 20, marginBottom: 0, fontSize: ".75rem" }}>
        Tüm saatler İstanbul saatidir. Randevu ayrıntılarını açmak için kayda tıklayın. Çalışma
        saatleri ve tatiller “Çalışma saatleri” bölümünden düzenlenir.
      </p>
    </div>
  );
}
