CREATE TABLE "service_catalog_entries" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "charge_type" "ChargeType" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_catalog_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "service_catalog_entries_branch_id_charge_type_key" ON "service_catalog_entries"("branch_id", "charge_type");

ALTER TABLE "service_catalog_entries" ADD CONSTRAINT "service_catalog_entries_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
