CREATE TABLE "fantasy_onboardings" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'not_started',
  "current_step" TEXT NOT NULL DEFAULT 'welcome',
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "fantasy_onboardings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fantasy_onboardings_user_id_key" ON "fantasy_onboardings"("user_id");
CREATE INDEX "fantasy_onboardings_status_idx" ON "fantasy_onboardings"("status");

ALTER TABLE "fantasy_onboardings"
  ADD CONSTRAINT "fantasy_onboardings_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "fantasy_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
