CREATE TABLE "fantasy_leagues" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "invite_code" TEXT NOT NULL,
    "commissioner_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'lobby',
    "max_members" INTEGER NOT NULL DEFAULT 8,
    "roster_size" INTEGER NOT NULL DEFAULT 6,
    "turn_seconds" INTEGER NOT NULL DEFAULT 90,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fantasy_leagues_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fantasy_league_members" (
    "id" TEXT NOT NULL,
    "league_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "status" TEXT NOT NULL DEFAULT 'active',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fantasy_league_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fantasy_teams" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "budget" INTEGER NOT NULL DEFAULT 100,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fantasy_teams_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fantasy_drafts" (
    "id" TEXT NOT NULL,
    "league_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "current_pick" INTEGER NOT NULL DEFAULT 1,
    "started_at" TIMESTAMP(3),
    "pick_deadline" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fantasy_drafts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fantasy_draft_picks" (
    "id" TEXT NOT NULL,
    "draft_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "overall" INTEGER NOT NULL,
    "auto_picked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fantasy_draft_picks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fantasy_leagues_invite_code_key" ON "fantasy_leagues"("invite_code");
CREATE INDEX "fantasy_leagues_commissioner_id_created_at_idx" ON "fantasy_leagues"("commissioner_id", "created_at");
CREATE INDEX "fantasy_leagues_status_idx" ON "fantasy_leagues"("status");
CREATE UNIQUE INDEX "fantasy_league_members_league_id_user_id_key" ON "fantasy_league_members"("league_id", "user_id");
CREATE INDEX "fantasy_league_members_user_id_status_idx" ON "fantasy_league_members"("user_id", "status");
CREATE UNIQUE INDEX "fantasy_teams_member_id_key" ON "fantasy_teams"("member_id");
CREATE UNIQUE INDEX "fantasy_drafts_league_id_key" ON "fantasy_drafts"("league_id");
CREATE INDEX "fantasy_drafts_status_pick_deadline_idx" ON "fantasy_drafts"("status", "pick_deadline");
CREATE UNIQUE INDEX "fantasy_draft_picks_draft_id_player_id_key" ON "fantasy_draft_picks"("draft_id", "player_id");
CREATE UNIQUE INDEX "fantasy_draft_picks_draft_id_overall_key" ON "fantasy_draft_picks"("draft_id", "overall");
CREATE INDEX "fantasy_draft_picks_team_id_created_at_idx" ON "fantasy_draft_picks"("team_id", "created_at");

ALTER TABLE "fantasy_leagues" ADD CONSTRAINT "fantasy_leagues_commissioner_id_fkey" FOREIGN KEY ("commissioner_id") REFERENCES "fantasy_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fantasy_league_members" ADD CONSTRAINT "fantasy_league_members_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "fantasy_leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fantasy_league_members" ADD CONSTRAINT "fantasy_league_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "fantasy_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fantasy_teams" ADD CONSTRAINT "fantasy_teams_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "fantasy_league_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fantasy_drafts" ADD CONSTRAINT "fantasy_drafts_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "fantasy_leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fantasy_draft_picks" ADD CONSTRAINT "fantasy_draft_picks_draft_id_fkey" FOREIGN KEY ("draft_id") REFERENCES "fantasy_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fantasy_draft_picks" ADD CONSTRAINT "fantasy_draft_picks_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "fantasy_league_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fantasy_draft_picks" ADD CONSTRAINT "fantasy_draft_picks_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "fantasy_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fantasy_draft_picks" ADD CONSTRAINT "fantasy_draft_picks_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
