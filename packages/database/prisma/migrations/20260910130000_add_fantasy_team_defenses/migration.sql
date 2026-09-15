-- A draft pick can now represent either an individual player or an institutional
-- team defense. Team defenses have no Fantasy points in this first iteration.
ALTER TABLE "fantasy_draft_picks" ALTER COLUMN "player_id" DROP NOT NULL;
ALTER TABLE "fantasy_draft_picks" ADD COLUMN "defense_team_id" TEXT;
CREATE UNIQUE INDEX "fantasy_draft_picks_draft_id_defense_team_id_key" ON "fantasy_draft_picks"("draft_id", "defense_team_id");
CREATE INDEX "fantasy_draft_picks_defense_team_id_idx" ON "fantasy_draft_picks"("defense_team_id");
ALTER TABLE "fantasy_draft_picks" ADD CONSTRAINT "fantasy_draft_picks_defense_team_id_fkey" FOREIGN KEY ("defense_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
