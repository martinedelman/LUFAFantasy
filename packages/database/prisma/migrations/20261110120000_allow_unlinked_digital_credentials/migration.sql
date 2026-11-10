ALTER TABLE "users" ADD COLUMN "email_verified_at" TIMESTAMP(3);

ALTER TABLE "digital_credentials"
  ALTER COLUMN "user_id" DROP NOT NULL,
  ADD COLUMN "claim_email" TEXT,
  ADD CONSTRAINT "digital_credentials_has_identity" CHECK ("user_id" IS NOT NULL OR "claim_email" IS NOT NULL);

CREATE INDEX "digital_credentials_claim_email_status_idx"
  ON "digital_credentials"("claim_email", "status");
