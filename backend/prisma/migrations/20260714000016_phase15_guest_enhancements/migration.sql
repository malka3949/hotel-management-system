-- Phase 15 guest experience enhancements
ALTER TABLE "room_types" ADD COLUMN "bed_type" VARCHAR(50);
ALTER TABLE "room_types" ADD COLUMN "room_size" INTEGER;
ALTER TABLE "branches" ADD COLUMN "amenities" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "branches" ADD COLUMN "cancellation_policy" TEXT;
