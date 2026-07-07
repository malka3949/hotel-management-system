-- Make payments.created_by nullable (portal payments have no staff user)
ALTER TABLE "payments" ALTER COLUMN "created_by" DROP NOT NULL;

-- CreateEnum
CREATE TYPE "TokenPurpose" AS ENUM ('view', 'checkin', 'payment');

-- CreateTable
CREATE TABLE "guest_access_tokens" (
    "id" TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "guest_id" TEXT NOT NULL,
    "token_hash" VARCHAR NOT NULL,
    "purpose" "TokenPurpose" NOT NULL DEFAULT 'view',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_access_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "online_check_ins" (
    "id" TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "guest_id" TEXT NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "passport_id" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(30),
    "estimated_arrival_time" VARCHAR(5),
    "special_requests" TEXT,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "online_check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guest_access_tokens_token_hash_idx" ON "guest_access_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "guest_access_tokens_reservation_id_idx" ON "guest_access_tokens"("reservation_id");

-- CreateIndex
CREATE UNIQUE INDEX "online_check_ins_reservation_id_key" ON "online_check_ins"("reservation_id");

-- AddForeignKey
ALTER TABLE "guest_access_tokens" ADD CONSTRAINT "guest_access_tokens_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_access_tokens" ADD CONSTRAINT "guest_access_tokens_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "online_check_ins" ADD CONSTRAINT "online_check_ins_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "online_check_ins" ADD CONSTRAINT "online_check_ins_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
