-- Phase 15: Add max_adults and max_children to room_types
ALTER TABLE "room_types" ADD COLUMN "max_adults" INTEGER;
ALTER TABLE "room_types" ADD COLUMN "max_children" INTEGER;
