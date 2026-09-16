CREATE TABLE "fantasy_player_favorites" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "player_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fantasy_player_favorites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fantasy_player_favorites_user_id_player_id_key" ON "fantasy_player_favorites"("user_id", "player_id");
CREATE INDEX "fantasy_player_favorites_user_id_created_at_idx" ON "fantasy_player_favorites"("user_id", "created_at");

ALTER TABLE "fantasy_player_favorites" ADD CONSTRAINT "fantasy_player_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "fantasy_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fantasy_player_favorites" ADD CONSTRAINT "fantasy_player_favorites_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
