-- Enable pg_trgm for fuzzy name search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('passport', 'id_card', 'drivers_license', 'other');

-- CreateTable
CREATE TABLE "guests" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(30) NOT NULL,
    "passport_id" VARCHAR(50),
    "nationality" VARCHAR(10),
    "date_of_birth" DATE,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_documents" (
    "id" TEXT NOT NULL,
    "guest_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "document_number" VARCHAR(100) NOT NULL,
    "issuing_country" VARCHAR(10) NOT NULL,
    "expiry_date" DATE,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "recorded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guests_branch_id_email_idx" ON "guests"("branch_id", "email");

-- CreateIndex
CREATE INDEX "guests_branch_id_phone_idx" ON "guests"("branch_id", "phone");

-- CreateIndex
CREATE INDEX "guests_branch_id_passport_id_idx" ON "guests"("branch_id", "passport_id");

-- CreateIndex (trigram index for full-text name search)
CREATE INDEX "guests_full_name_trgm_idx" ON "guests" USING gin ("full_name" gin_trgm_ops);

-- AddForeignKey
ALTER TABLE "guests" ADD CONSTRAINT "guests_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "branches"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_documents" ADD CONSTRAINT "guest_documents_guest_id_fkey"
    FOREIGN KEY ("guest_id") REFERENCES "guests"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_documents" ADD CONSTRAINT "guest_documents_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "branches"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_documents" ADD CONSTRAINT "guest_documents_recorded_by_fkey"
    FOREIGN KEY ("recorded_by") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
