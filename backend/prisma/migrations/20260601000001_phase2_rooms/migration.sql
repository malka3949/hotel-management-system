-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('available', 'occupied', 'maintenance', 'out_of_order');

-- CreateEnum
CREATE TYPE "CleaningStatus" AS ENUM ('clean', 'dirty', 'in_progress');

-- CreateTable
CREATE TABLE "room_types" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "base_price" DECIMAL(10,2) NOT NULL,
    "max_occupancy" INTEGER NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "room_type_id" TEXT NOT NULL,
    "number" VARCHAR(20) NOT NULL,
    "floor" INTEGER,
    "status" "RoomStatus" NOT NULL DEFAULT 'available',
    "cleaning_status" "CleaningStatus" NOT NULL DEFAULT 'clean',
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_branch_id_number_key" ON "rooms"("branch_id", "number");

-- CreateIndex
CREATE INDEX "rooms_branch_id_status_idx" ON "rooms"("branch_id", "status");

-- CreateIndex
CREATE INDEX "rooms_branch_id_room_type_id_idx" ON "rooms"("branch_id", "room_type_id");

-- AddForeignKey
ALTER TABLE "room_types" ADD CONSTRAINT "room_types_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "branches"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "branches"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_room_type_id_fkey"
    FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
