CREATE TABLE "analytics_reports" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "scope" TEXT NOT NULL DEFAULT 'personal',
    "filters" JSONB NOT NULL,
    "widgets" JSONB NOT NULL,
    "layouts" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "analytics_reports_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "analytics_reports" ADD CONSTRAINT "analytics_reports_owner_id_fkey"
  FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "analytics_reports_owner_id_scope_idx" ON "analytics_reports"("owner_id", "scope");
CREATE INDEX "analytics_reports_scope_updated_at_idx" ON "analytics_reports"("scope", "updated_at");
