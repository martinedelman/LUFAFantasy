-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "avatar" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),
    "profile" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournaments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "season" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "registration_deadline" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "format" TEXT NOT NULL DEFAULT 'league',
    "playoff_criteria" TEXT,
    "rules" JSONB,
    "prizes" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "divisions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "age_group" TEXT,
    "tournament_id" TEXT,
    "max_teams" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "divisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "logo" TEXT,
    "background_image" TEXT,
    "colors" JSONB NOT NULL,
    "division_id" TEXT NOT NULL,
    "tournament_id" TEXT,
    "coach" JSONB,
    "coaches" JSONB,
    "contact" JSONB NOT NULL,
    "registration_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "profile_picture" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "team_id" TEXT NOT NULL,
    "jersey_number" INTEGER,
    "position" TEXT NOT NULL,
    "secondary_position" TEXT,
    "height" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "experience" TEXT,
    "emergency_contact" JSONB,
    "medical_info" JSONB,
    "registration_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "judges" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "judges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "division_id" TEXT NOT NULL,
    "home_team_id" TEXT,
    "away_team_id" TEXT,
    "venue" JSONB NOT NULL,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "actual_start_time" TIMESTAMP(3),
    "actual_end_time" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "phase" TEXT NOT NULL DEFAULT 'regular',
    "playoff_slot" TEXT,
    "week" INTEGER,
    "round" TEXT,
    "officials" JSONB NOT NULL,
    "weather" JSONB,
    "score" JSONB NOT NULL,
    "statistics" JSONB NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_events" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "division_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "player_id" TEXT,
    "qb_id" TEXT,
    "qb_stat_value" DOUBLE PRECISION,
    "quarter" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "time" TEXT,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "yards" DOUBLE PRECISION,
    "points" DOUBLE PRECISION,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "standings" (
    "id" TEXT NOT NULL,
    "division_id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "ties" INTEGER NOT NULL DEFAULT 0,
    "points_for" INTEGER NOT NULL DEFAULT 0,
    "points_against" INTEGER NOT NULL DEFAULT 0,
    "points_differential" INTEGER NOT NULL DEFAULT 0,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "streak" TEXT,
    "last_five_games" TEXT,
    "home_record" JSONB,
    "away_record" JSONB,
    "division_record" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "standings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_verifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "otp_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_event_corrections" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "event_id" TEXT,
    "operation" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "proposed_event" JSONB,
    "original_event" JSONB,
    "requested_by_id" TEXT NOT NULL,
    "requested_by_name" TEXT,
    "requested_by_email" TEXT,
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_event_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_import_migrations" (
    "id" TEXT NOT NULL,
    "source_key" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "marca_temporal" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "player_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_import_migrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'global',
    "whatsapp_message_template" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL DEFAULT '',
    "contact_whatsapp" TEXT NOT NULL DEFAULT '',
    "instagram_url" TEXT NOT NULL DEFAULT '',
    "whatsapp_channel_url" TEXT NOT NULL DEFAULT '',
    "sponsors" JSONB NOT NULL,
    "homepage_announcement" JSONB NOT NULL,
    "feature_visibility" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flag_interests" (
    "id" TEXT NOT NULL,
    "interest_type" TEXT NOT NULL,
    "interest_label" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age_range" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "whatsapp_digits" TEXT NOT NULL,
    "experience" TEXT DEFAULT '',
    "company" TEXT DEFAULT '',
    "sponsor_interest" TEXT DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'sumate',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flag_interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_name" TEXT NOT NULL,
    "actor_email" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "entity_label" TEXT,
    "summary" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_statistics" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "division_id" TEXT NOT NULL,
    "passing" JSONB NOT NULL,
    "rushing" JSONB NOT NULL,
    "receiving" JSONB NOT NULL,
    "defensive" JSONB NOT NULL,
    "kicking" JSONB,
    "punting" JSONB,
    "returning" JSONB,
    "games_played" INTEGER NOT NULL DEFAULT 0,
    "games_started" INTEGER NOT NULL DEFAULT 0,
    "minutes_played" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_statistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_statistics" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "division_id" TEXT NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "ties" INTEGER NOT NULL DEFAULT 0,
    "points_for" INTEGER NOT NULL DEFAULT 0,
    "points_against" INTEGER NOT NULL DEFAULT 0,
    "points_differential" INTEGER NOT NULL DEFAULT 0,
    "offensive_stats" JSONB NOT NULL,
    "defensive_stats" JSONB NOT NULL,
    "turnovers" INTEGER NOT NULL DEFAULT 0,
    "turnover_differential" INTEGER NOT NULL DEFAULT 0,
    "penalties" INTEGER NOT NULL DEFAULT 0,
    "penalty_yards" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_statistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venues" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "zip_code" TEXT,
    "coordinates" JSONB,
    "capacity" INTEGER,
    "field_type" TEXT NOT NULL,
    "facilities" JSONB NOT NULL,
    "availability" JSONB NOT NULL,
    "contact" JSONB NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_divisions" (
    "tournament_id" TEXT NOT NULL,
    "division_id" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tournament_divisions_pkey" PRIMARY KEY ("tournament_id","division_id")
);

-- CreateTable
CREATE TABLE "tournament_teams" (
    "tournament_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tournament_teams_pkey" PRIMARY KEY ("tournament_id","team_id")
);

-- CreateTable
CREATE TABLE "division_teams" (
    "division_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "division_teams_pkey" PRIMARY KEY ("division_id","team_id")
);

-- CreateTable
CREATE TABLE "team_players" (
    "team_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "team_players_pkey" PRIMARY KEY ("team_id","player_id")
);

-- CreateTable
CREATE TABLE "game_present_players" (
    "game_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "game_present_players_pkey" PRIMARY KEY ("game_id","player_id","side")
);

-- CreateTable
CREATE TABLE "season_tournaments" (
    "season_id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "season_tournaments_pkey" PRIMARY KEY ("season_id","tournament_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE INDEX "tournaments_status_idx" ON "tournaments"("status");

-- CreateIndex
CREATE INDEX "tournaments_playoff_criteria_idx" ON "tournaments"("playoff_criteria");

-- CreateIndex
CREATE INDEX "tournaments_start_date_idx" ON "tournaments"("start_date");

-- CreateIndex
CREATE UNIQUE INDEX "tournaments_name_year_key" ON "tournaments"("name", "year");

-- CreateIndex
CREATE INDEX "divisions_name_category_idx" ON "divisions"("name", "category");

-- CreateIndex
CREATE INDEX "divisions_category_idx" ON "divisions"("category");

-- CreateIndex
CREATE INDEX "divisions_tournament_id_idx" ON "divisions"("tournament_id");

-- CreateIndex
CREATE INDEX "teams_division_id_idx" ON "teams"("division_id");

-- CreateIndex
CREATE INDEX "teams_tournament_id_idx" ON "teams"("tournament_id");

-- CreateIndex
CREATE INDEX "teams_status_idx" ON "teams"("status");

-- CreateIndex
CREATE UNIQUE INDEX "teams_name_division_id_key" ON "teams"("name", "division_id");

-- CreateIndex
CREATE INDEX "players_first_name_last_name_idx" ON "players"("first_name", "last_name");

-- CreateIndex
CREATE INDEX "players_team_id_idx" ON "players"("team_id");

-- CreateIndex
CREATE INDEX "players_position_idx" ON "players"("position");

-- CreateIndex
CREATE INDEX "players_secondary_position_idx" ON "players"("secondary_position");

-- CreateIndex
CREATE INDEX "players_status_idx" ON "players"("status");

-- Preserve MongoDB's partial jersey-number uniqueness: players without a
-- number may coexist, but a concrete number is unique inside a team.
CREATE UNIQUE INDEX "players_team_id_jersey_number_key"
ON "players"("team_id", "jersey_number")
WHERE "jersey_number" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "judges_normalized_name_key" ON "judges"("normalized_name");

-- CreateIndex
CREATE INDEX "judges_first_name_last_name_idx" ON "judges"("first_name", "last_name");

-- CreateIndex
CREATE INDEX "games_tournament_id_division_id_idx" ON "games"("tournament_id", "division_id");

-- CreateIndex
CREATE INDEX "games_scheduled_date_idx" ON "games"("scheduled_date");

-- CreateIndex
CREATE INDEX "games_status_idx" ON "games"("status");

-- CreateIndex
CREATE INDEX "games_phase_idx" ON "games"("phase");

-- CreateIndex
CREATE INDEX "games_tournament_id_division_id_playoff_slot_idx" ON "games"("tournament_id", "division_id", "playoff_slot");

-- CreateIndex
CREATE INDEX "games_week_idx" ON "games"("week");

-- TBD playoff games may have null teams. Only fully assigned fixtures are
-- subject to the scheduling uniqueness rule used by MongoDB.
CREATE UNIQUE INDEX "games_assigned_fixture_key"
ON "games"("home_team_id", "away_team_id", "scheduled_date")
WHERE "home_team_id" IS NOT NULL AND "away_team_id" IS NOT NULL;

-- CreateIndex
CREATE INDEX "game_events_division_id_type_points_player_id_idx" ON "game_events"("division_id", "type", "points", "player_id");

-- CreateIndex
CREATE INDEX "game_events_tournament_id_division_id_type_points_player_id_idx" ON "game_events"("tournament_id", "division_id", "type", "points", "player_id");

-- CreateIndex
CREATE INDEX "game_events_player_id_game_id_idx" ON "game_events"("player_id", "game_id");

-- CreateIndex
CREATE INDEX "game_events_qb_id_game_id_idx" ON "game_events"("qb_id", "game_id");

-- CreateIndex
CREATE INDEX "game_events_team_id_game_id_idx" ON "game_events"("team_id", "game_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_events_game_id_sequence_key" ON "game_events"("game_id", "sequence");

-- CreateIndex
CREATE INDEX "standings_tournament_id_idx" ON "standings"("tournament_id");

-- CreateIndex
CREATE INDEX "standings_division_id_position_idx" ON "standings"("division_id", "position");

-- CreateIndex
CREATE INDEX "standings_division_id_percentage_idx" ON "standings"("division_id", "percentage");

-- CreateIndex
CREATE UNIQUE INDEX "standings_division_id_tournament_id_team_id_key" ON "standings"("division_id", "tournament_id", "team_id");

-- CreateIndex
CREATE UNIQUE INDEX "otp_verifications_token_hash_key" ON "otp_verifications"("token_hash");

-- CreateIndex
CREATE INDEX "otp_verifications_email_idx" ON "otp_verifications"("email");

-- CreateIndex
CREATE INDEX "otp_verifications_purpose_idx" ON "otp_verifications"("purpose");

-- CreateIndex
CREATE INDEX "otp_verifications_expires_at_idx" ON "otp_verifications"("expires_at");

-- CreateIndex
CREATE INDEX "otp_verifications_user_id_purpose_consumed_at_idx" ON "otp_verifications"("user_id", "purpose", "consumed_at");

-- CreateIndex
CREATE INDEX "game_event_corrections_status_created_at_idx" ON "game_event_corrections"("status", "created_at");

-- CreateIndex
CREATE INDEX "game_event_corrections_game_id_status_idx" ON "game_event_corrections"("game_id", "status");

-- CreateIndex
CREATE INDEX "game_event_corrections_requested_by_id_status_idx" ON "game_event_corrections"("requested_by_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "player_import_migrations_source_key_key" ON "player_import_migrations"("source_key");

-- CreateIndex
CREATE INDEX "player_import_migrations_email_idx" ON "player_import_migrations"("email");

-- CreateIndex
CREATE UNIQUE INDEX "site_settings_key_key" ON "site_settings"("key");

-- CreateIndex
CREATE INDEX "flag_interests_interest_type_created_at_idx" ON "flag_interests"("interest_type", "created_at");

-- CreateIndex
CREATE INDEX "flag_interests_whatsapp_digits_created_at_idx" ON "flag_interests"("whatsapp_digits", "created_at");

-- CreateIndex
CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "admin_audit_logs_actor_email_created_at_idx" ON "admin_audit_logs"("actor_email", "created_at");

-- CreateIndex
CREATE INDEX "admin_audit_logs_action_created_at_idx" ON "admin_audit_logs"("action", "created_at");

-- CreateIndex
CREATE INDEX "admin_audit_logs_entity_type_entity_id_created_at_idx" ON "admin_audit_logs"("entity_type", "entity_id", "created_at");

-- CreateIndex
CREATE INDEX "player_statistics_tournament_id_division_id_idx" ON "player_statistics"("tournament_id", "division_id");

-- CreateIndex
CREATE INDEX "player_statistics_player_id_idx" ON "player_statistics"("player_id");

-- CreateIndex
CREATE UNIQUE INDEX "player_statistics_player_id_tournament_id_division_id_key" ON "player_statistics"("player_id", "tournament_id", "division_id");

-- CreateIndex
CREATE INDEX "team_statistics_tournament_id_division_id_idx" ON "team_statistics"("tournament_id", "division_id");

-- CreateIndex
CREATE INDEX "team_statistics_team_id_idx" ON "team_statistics"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_statistics_team_id_tournament_id_division_id_key" ON "team_statistics"("team_id", "tournament_id", "division_id");

-- CreateIndex
CREATE INDEX "venues_city_idx" ON "venues"("city");

-- CreateIndex
CREATE INDEX "venues_field_type_idx" ON "venues"("field_type");

-- CreateIndex
CREATE UNIQUE INDEX "venues_name_city_key" ON "venues"("name", "city");

-- CreateIndex
CREATE INDEX "seasons_year_idx" ON "seasons"("year");

-- CreateIndex
CREATE INDEX "seasons_status_idx" ON "seasons"("status");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_name_year_key" ON "seasons"("name", "year");

-- CreateIndex
CREATE INDEX "game_present_players_game_id_side_ordinal_idx" ON "game_present_players"("game_id", "side", "ordinal");

-- AddForeignKey
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "divisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "divisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "divisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_qb_id_fkey" FOREIGN KEY ("qb_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standings" ADD CONSTRAINT "standings_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "divisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standings" ADD CONSTRAINT "standings_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standings" ADD CONSTRAINT "standings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_verifications" ADD CONSTRAINT "otp_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_event_corrections" ADD CONSTRAINT "game_event_corrections_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_event_corrections" ADD CONSTRAINT "game_event_corrections_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "game_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_event_corrections" ADD CONSTRAINT "game_event_corrections_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_event_corrections" ADD CONSTRAINT "game_event_corrections_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_import_migrations" ADD CONSTRAINT "player_import_migrations_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_statistics" ADD CONSTRAINT "player_statistics_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_statistics" ADD CONSTRAINT "player_statistics_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_statistics" ADD CONSTRAINT "player_statistics_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "divisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_statistics" ADD CONSTRAINT "team_statistics_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_statistics" ADD CONSTRAINT "team_statistics_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_statistics" ADD CONSTRAINT "team_statistics_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "divisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_divisions" ADD CONSTRAINT "tournament_divisions_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_divisions" ADD CONSTRAINT "tournament_divisions_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "divisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_teams" ADD CONSTRAINT "tournament_teams_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_teams" ADD CONSTRAINT "tournament_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "division_teams" ADD CONSTRAINT "division_teams_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "divisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "division_teams" ADD CONSTRAINT "division_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_players" ADD CONSTRAINT "team_players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_players" ADD CONSTRAINT "team_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_present_players" ADD CONSTRAINT "game_present_players_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_present_players" ADD CONSTRAINT "game_present_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_tournaments" ADD CONSTRAINT "season_tournaments_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_tournaments" ADD CONSTRAINT "season_tournaments_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
