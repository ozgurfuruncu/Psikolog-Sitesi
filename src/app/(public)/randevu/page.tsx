import { db } from "@/lib/db";
import { currentUser } from "@/lib/guards";
import { BookingForm } from "@/components/booking-form";
import { getSettings } from "@/lib/appointments";
export const dynamic = "force-dynamic";
export const metadata = { title: "Randevu oluştur" };
export default async function Booking({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const [{ service }, services, user, settings] = await Promise.all([
    searchParams,
    db.service.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
    currentUser(),
    getSettings(),
  ]);
  return (
    <div className="container page-space">
      <div className="page-intro">
        <p className="eyebrow">KENDİNİZE BİR ZAMAN AYIRIN</p>
        <h1>İlk adımınızı planlayın.</h1>
        <p>
          Görüşme türünüzü ve size uygun zamanı seçin. Geri kalanını hesabınızdan birlikte takip
          edelim.
        </p>
      </div>
      <BookingForm
        services={services}
        initialService={services.some((s) => s.id === service) ? service : undefined}
        signedIn={!!user}
        cancellationHours={settings.cancellationHours}
      />
    </div>
  );
}
