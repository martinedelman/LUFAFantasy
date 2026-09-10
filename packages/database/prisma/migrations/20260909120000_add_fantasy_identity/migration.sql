CREATE TABLE "fantasy_users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fantasy_users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fantasy_password_resets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fantasy_password_resets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fantasy_feature_assignments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fantasy_feature_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fantasy_audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fantasy_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fantasy_users_email_key" ON "fantasy_users"("email");
CREATE INDEX "fantasy_password_resets_user_id_code_hash_consumed_at_idx" ON "fantasy_password_resets"("user_id", "code_hash", "consumed_at");
CREATE INDEX "fantasy_password_resets_expires_at_idx" ON "fantasy_password_resets"("expires_at");
CREATE UNIQUE INDEX "fantasy_feature_assignments_user_id_key_key" ON "fantasy_feature_assignments"("user_id", "key");
CREATE INDEX "fantasy_feature_assignments_key_enabled_idx" ON "fantasy_feature_assignments"("key", "enabled");
CREATE INDEX "fantasy_audit_logs_actor_id_created_at_idx" ON "fantasy_audit_logs"("actor_id", "created_at");
CREATE INDEX "fantasy_audit_logs_action_created_at_idx" ON "fantasy_audit_logs"("action", "created_at");

ALTER TABLE "fantasy_password_resets" ADD CONSTRAINT "fantasy_password_resets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "fantasy_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fantasy_feature_assignments" ADD CONSTRAINT "fantasy_feature_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "fantasy_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fantasy_audit_logs" ADD CONSTRAINT "fantasy_audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "fantasy_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
