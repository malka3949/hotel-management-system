CREATE TABLE "guest_feedback" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "reservation_id" TEXT NOT NULL,
  "guest_id" TEXT NOT NULL,
  "branch_id" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "sentiment" VARCHAR(20),
  "ai_summary" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "guest_feedback_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "guest_feedback_rating_check" CHECK ("rating" BETWEEN 1 AND 5),
  CONSTRAINT "guest_feedback_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "guest_feedback_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "guest_feedback_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "guest_feedback_reservation_id_key" ON "guest_feedback"("reservation_id");
CREATE INDEX "guest_feedback_branch_id_idx" ON "guest_feedback"("branch_id");
CREATE INDEX "guest_feedback_branch_rating_idx" ON "guest_feedback"("branch_id", "rating");
