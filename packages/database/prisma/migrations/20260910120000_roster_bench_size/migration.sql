-- Roster slots are now fixed (8 starters) plus configurable bench players.
-- Existing leagues used 12 as the full roster size; migrate those to 4 bench slots.
ALTER TABLE "fantasy_leagues" ALTER COLUMN "roster_size" SET DEFAULT 4;
UPDATE "fantasy_leagues" SET "roster_size" = 4 WHERE "roster_size" = 12;
