CREATE TABLE "digital_credentials" (
  "id" TEXT NOT NULL,
  "public_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "player_id" TEXT,
  "judge_id" TEXT,
  "subject_type" TEXT NOT NULL,
  "member_number" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "profile_picture" TEXT,
  "role_label" TEXT NOT NULL,
  "organization_name" TEXT NOT NULL,
  "nationality_code" TEXT NOT NULL,
  "date_of_birth" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  "renewed_from_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "digital_credentials_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "digital_credential_audits" (
  "id" TEXT NOT NULL,
  "credential_id" TEXT,
  "action" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "digital_credential_audits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "digital_credentials_public_id_key" ON "digital_credentials"("public_id");
CREATE UNIQUE INDEX "digital_credentials_member_number_key" ON "digital_credentials"("member_number");
CREATE INDEX "digital_credentials_user_id_status_idx" ON "digital_credentials"("user_id", "status");
CREATE INDEX "digital_credentials_player_id_idx" ON "digital_credentials"("player_id");
CREATE INDEX "digital_credentials_judge_id_idx" ON "digital_credentials"("judge_id");
CREATE INDEX "digital_credentials_status_expires_at_idx" ON "digital_credentials"("status", "expires_at");
CREATE INDEX "digital_credential_audits_credential_id_created_at_idx" ON "digital_credential_audits"("credential_id", "created_at");
CREATE INDEX "digital_credential_audits_action_created_at_idx" ON "digital_credential_audits"("action", "created_at");

ALTER TABLE "digital_credentials" ADD CONSTRAINT "digital_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "digital_credentials" ADD CONSTRAINT "digital_credentials_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "digital_credentials" ADD CONSTRAINT "digital_credentials_judge_id_fkey" FOREIGN KEY ("judge_id") REFERENCES "judges"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "digital_credential_audits" ADD CONSTRAINT "digital_credential_audits_credential_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "digital_credentials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
