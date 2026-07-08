-- Phase 9: Housekeeping Module

CREATE TYPE "HousekeepingTaskStatus" AS ENUM ('pending', 'in_progress', 'completed', 'skipped');
CREATE TYPE "HousekeepingPriority" AS ENUM ('normal', 'urgent');

CREATE TABLE "housekeeping_tasks" (
    "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
    "branch_id"      UUID NOT NULL,
    "room_id"        UUID NOT NULL,
    "reservation_id" UUID,
    "assigned_to"    UUID,
    "status"         "HousekeepingTaskStatus" NOT NULL DEFAULT 'pending',
    "priority"       "HousekeepingPriority"   NOT NULL DEFAULT 'normal',
    "notes"          TEXT,
    "scheduled_for"  DATE NOT NULL,
    "started_at"     TIMESTAMP(3),
    "completed_at"   TIMESTAMP(3),
    "created_by"     UUID,
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "housekeeping_tasks_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "housekeeping_tasks"
    ADD CONSTRAINT "housekeeping_tasks_branch_id_fkey"
        FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "housekeeping_tasks"
    ADD CONSTRAINT "housekeeping_tasks_room_id_fkey"
        FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "housekeeping_tasks"
    ADD CONSTRAINT "housekeeping_tasks_reservation_id_fkey"
        FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "housekeeping_tasks"
    ADD CONSTRAINT "housekeeping_tasks_assigned_to_fkey"
        FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "housekeeping_tasks"
    ADD CONSTRAINT "housekeeping_tasks_created_by_fkey"
        FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "housekeeping_tasks_branch_id_status_idx"
    ON "housekeeping_tasks"("branch_id", "status");

CREATE INDEX "housekeeping_tasks_branch_id_assigned_to_status_idx"
    ON "housekeeping_tasks"("branch_id", "assigned_to", "status");

CREATE INDEX "housekeeping_tasks_branch_id_scheduled_for_idx"
    ON "housekeeping_tasks"("branch_id", "scheduled_for");
