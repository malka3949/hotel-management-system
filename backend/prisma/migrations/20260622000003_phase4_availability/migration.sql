-- Phase 4: Availability Engine
-- Creates reservations table (queried by AvailabilityService; CRUD added in Phase 5)

CREATE TYPE "ReservationStatus" AS ENUM (
  'pending',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
  'no_show'
);

CREATE TABLE "reservations" (
  "id"             TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "branch_id"      TEXT         NOT NULL,
  "room_id"        TEXT         NOT NULL,
  "guest_id"       TEXT         NOT NULL,
  "check_in_date"  DATE         NOT NULL,
  "check_out_date" DATE         NOT NULL,
  "status"         "ReservationStatus" NOT NULL DEFAULT 'pending',
  "total_price"    DECIMAL(10,2) NOT NULL,
  "source"         VARCHAR(50),
  "notes"          TEXT,
  "version"        INTEGER      NOT NULL DEFAULT 0,
  "created_by"     TEXT         NOT NULL,
  "created_at"     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "updated_at"     TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT "reservations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "reservations_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "branches"("id"),
  CONSTRAINT "reservations_room_id_fkey"
    FOREIGN KEY ("room_id") REFERENCES "rooms"("id"),
  CONSTRAINT "reservations_guest_id_fkey"
    FOREIGN KEY ("guest_id") REFERENCES "guests"("id"),
  CONSTRAINT "reservations_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users"("id")
);

CREATE INDEX "reservations_branch_check_dates_idx"
  ON "reservations"("branch_id", "check_in_date", "check_out_date");

CREATE INDEX "reservations_room_check_dates_idx"
  ON "reservations"("room_id", "check_in_date", "check_out_date");

CREATE INDEX "reservations_branch_status_idx"
  ON "reservations"("branch_id", "status");
