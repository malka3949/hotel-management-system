-- Add ip_address and user_agent to audit_logs for Privacy Protection Law §10
-- (2017 Regulations תקנה 10(ב)(4) — terminal identification on every data access)
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "ip_address" VARCHAR(45);
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "user_agent" VARCHAR(500);
