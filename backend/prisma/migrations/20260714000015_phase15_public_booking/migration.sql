-- Phase 15: Public Booking Portal
-- Add marketing fields to Branch and RoomType

ALTER TABLE "branches" ADD COLUMN "description" TEXT;
ALTER TABLE "branches" ADD COLUMN "cover_photo" VARCHAR(2048);

ALTER TABLE "room_types" ADD COLUMN "photos" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "room_types" ADD COLUMN "amenities" TEXT[] NOT NULL DEFAULT '{}';

-- Allow public (website) reservations without a staff createdBy
ALTER TABLE "reservations" ALTER COLUMN "created_by" DROP NOT NULL;
