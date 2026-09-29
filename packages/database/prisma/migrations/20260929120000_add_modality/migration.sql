-- Flag and tackle share the same tables. Existing rows are flag.
ALTER TABLE "tournaments" ADD COLUMN "modality" TEXT NOT NULL DEFAULT 'flag';
ALTER TABLE "divisions" ADD COLUMN "modality" TEXT NOT NULL DEFAULT 'flag';
ALTER TABLE "flag_interests" ADD COLUMN "modality" TEXT NOT NULL DEFAULT 'flag';

-- The same tournament name/year can exist once per modality.
DROP INDEX "tournaments_name_year_key";
CREATE UNIQUE INDEX "tournaments_name_year_modality_key" ON "tournaments"("name", "year", "modality");

CREATE INDEX "tournaments_modality_idx" ON "tournaments"("modality");
CREATE INDEX "divisions_modality_idx" ON "divisions"("modality");
CREATE INDEX "flag_interests_modality_created_at_idx" ON "flag_interests"("modality", "created_at");
