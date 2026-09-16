-- Favorites may point to an individual player or to a team defense.
ALTER TABLE "fantasy_player_favorites" ALTER COLUMN "player_id" DROP NOT NULL;
ALTER TABLE "fantasy_player_favorites" ADD COLUMN "defense_team_id" TEXT;
CREATE UNIQUE INDEX "fantasy_player_favorites_user_id_defense_team_id_key" ON "fantasy_player_favorites"("user_id", "defense_team_id");
CREATE INDEX "fantasy_player_favorites_defense_team_id_idx" ON "fantasy_player_favorites"("defense_team_id");
ALTER TABLE "fantasy_player_favorites" ADD CONSTRAINT "fantasy_player_favorites_defense_team_id_fkey" FOREIGN KEY ("defense_team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
