-- A single practitioner owns the calendar. Native range GiST support requires no extension.
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_no_overlap"
  EXCLUDE USING gist (tsrange("startsAt", "reservedUntil", '[)') WITH &&)
  WHERE (status IN ('PENDING_APPROVAL','ALTERNATIVE_PROPOSED','AWAITING_PAYMENT','CONFIRMED','IN_PROGRESS'));
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_valid_range" CHECK ("endsAt" > "startsAt" AND "reservedUntil" >= "endsAt");
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_price_positive" CHECK ("priceKurus" >= 0 AND "durationMinutes" > 0 AND currency = 'TRY');
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_valid_amount" CHECK ("amountKurus" >= 0 AND currency = 'TRY');
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_valid_amount" CHECK ("amountKurus" > 0);
ALTER TABLE "Service" ADD CONSTRAINT "Service_valid_config" CHECK ("durationMinutes" BETWEEN 15 AND 120 AND "priceKurus" >= 0 AND currency = 'TRY' AND (NOT "paymentRequired" OR "priceKurus" > 0));
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_rating_range" CHECK (overall BETWEEN 1 AND 5 AND communication BETWEEN 1 AND 5 AND booking BETWEEN 1 AND 5 AND technical BETWEEN 1 AND 5);
ALTER TABLE "AvailabilityRule" ADD CONSTRAINT "Availability_valid_range" CHECK ("dayOfWeek" BETWEEN 0 AND 6 AND "startMinute" >= 0 AND "endMinute" <= 1440 AND "endMinute" > "startMinute");
ALTER TABLE "BlockedTime" ADD CONSTRAINT "BlockedTime_valid_range" CHECK ("endsAt" > "startsAt");
ALTER TABLE "SiteSettings" ADD CONSTRAINT "Settings_valid_config" CHECK ("bookingNoticeHours" >= 0 AND "cancellationHours" >= 0 AND "bufferMinutes" >= 0 AND "holdHours" > 0 AND "paymentHoldHours" > 0);
