-- Remove relations used only to duplicate data already reachable through games/details.
ALTER TABLE "game_events" DROP CONSTRAINT "game_events_division_id_fkey";
ALTER TABLE "game_events" DROP CONSTRAINT "game_events_qb_id_fkey";
ALTER TABLE "game_events" DROP CONSTRAINT "game_events_tournament_id_fkey";
ALTER TABLE "season_tournaments" DROP CONSTRAINT "season_tournaments_season_id_fkey";
ALTER TABLE "season_tournaments" DROP CONSTRAINT "season_tournaments_tournament_id_fkey";

DROP INDEX "game_events_division_id_type_points_player_id_idx";
DROP INDEX "game_events_qb_id_game_id_idx";
DROP INDEX "game_events_tournament_id_division_id_type_points_player_id_idx";
DROP INDEX "player_import_migrations_source_key_key";
DROP INDEX "site_settings_key_key";

ALTER TABLE "admin_audit_logs" DROP COLUMN "updated_at";

ALTER TABLE "flag_interests"
  DROP COLUMN "source",
  DROP COLUMN "updated_at";

ALTER TABLE "game_event_corrections" DROP COLUMN "updated_at";

ALTER TABLE "game_events"
  DROP COLUMN "division_id",
  DROP COLUMN "qb_id",
  DROP COLUMN "qb_stat_value",
  DROP COLUMN "tournament_id",
  DROP COLUMN "updated_at";

ALTER TABLE "games" DROP COLUMN "weather";
ALTER TABLE "otp_verifications" DROP COLUMN "updated_at";

ALTER TABLE "player_import_migrations"
  DROP CONSTRAINT "player_import_migrations_pkey",
  DROP COLUMN "created_at",
  DROP COLUMN "id",
  DROP COLUMN "updated_at",
  ADD CONSTRAINT "player_import_migrations_pkey" PRIMARY KEY ("source_key");

ALTER TABLE "player_statistics"
  DROP COLUMN "created_at",
  DROP COLUMN "games_started",
  DROP COLUMN "kicking",
  DROP COLUMN "minutes_played",
  DROP COLUMN "punting",
  DROP COLUMN "returning",
  DROP COLUMN "updated_at";

ALTER TABLE "players" DROP COLUMN "medical_info";

ALTER TABLE "site_settings"
  DROP CONSTRAINT "site_settings_pkey",
  DROP COLUMN "created_at",
  DROP COLUMN "id",
  ADD CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key");

ALTER TABLE "standings"
  DROP COLUMN "away_record",
  DROP COLUMN "division_record",
  DROP COLUMN "home_record";

ALTER TABLE "team_statistics"
  DROP COLUMN "created_at",
  DROP COLUMN "updated_at";

ALTER TABLE "users"
  DROP COLUMN "avatar",
  DROP COLUMN "profile";

DROP TABLE "season_tournaments";
DROP TABLE "seasons";
DROP TABLE "venues";

CREATE INDEX "game_events_type_points_player_id_idx"
  ON "game_events"("type", "points", "player_id");
