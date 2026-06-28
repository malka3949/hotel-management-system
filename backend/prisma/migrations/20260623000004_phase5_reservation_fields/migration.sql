-- Phase 5: Add ReservationSource enum, extend Reservation, create reservation_guests

CREATE TYPE "ReservationSource" AS ENUM ('walk_in', 'phone', 'website', 'ota');

ALTER TABLE "reservations"
  ADD COLUMN "adults"              INTEGER       NOT NULL DEFAULT 1,
  ADD COLUMN "children"            INTEGER       NOT NULL DEFAULT 0,
  ADD COLUMN "cancelled_at"        TIMESTAMP(3),
  ADD COLUMN "cancellation_reason" TEXT;

-- Migrate existing source string column to enum
ALTER TABLE "reservations"
  ALTER COLUMN "source" DROP DEFAULT,
  ALTER COLUMN "source" TYPE "ReservationSource"
    USING CASE
      WHEN source = 'phone'   THEN 'phone'::"ReservationSource"
      WHEN source = 'website' THEN 'website'::"ReservationSource"
      WHEN source = 'ota'     THEN 'ota'::"ReservationSource"
      ELSE 'walk_in'::"ReservationSource"
    END,
  ALTER COLUMN "source" SET DEFAULT 'walk_in'::"ReservationSource";

CREATE TABLE "reservation_guests" (
  "id"             TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "reservation_id" TEXT         NOT NULL,
  "guest_id"       TEXT         NOT NULL,
  "is_primary"     BOOLEAN      NOT NULL DEFAULT false,

  CONSTRAINT "reservation_guests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reservation_guests_reservation_id_idx" ON "reservation_guests"("reservation_id");

ALTER TABLE "reservation_guests"
  ADD CONSTRAINT "reservation_guests_reservation_id_fkey"
    FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reservation_guests"
  ADD CONSTRAINT "reservation_guests_guest_id_fkey"
    FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
