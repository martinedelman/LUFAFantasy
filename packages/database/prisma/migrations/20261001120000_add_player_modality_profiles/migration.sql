-- Per-modality jersey number and positions for players shared by flag and tackle.
CREATE TABLE "player_modality_profiles" (
    "player_id" TEXT NOT NULL,
    "modality" TEXT NOT NULL,
    "jersey_number" INTEGER,
    "position" TEXT NOT NULL,
    "secondary_position" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_modality_profiles_pkey" PRIMARY KEY ("player_id","modality")
);

CREATE INDEX "player_modality_profiles_modality_idx" ON "player_modality_profiles"("modality");

ALTER TABLE "player_modality_profiles" ADD CONSTRAINT "player_modality_profiles_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Every existing player plays on a flag team: seed their flag profile from the current columns.
INSERT INTO "player_modality_profiles" ("player_id", "modality", "jersey_number", "position", "secondary_position", "updated_at")
SELECT p."id", COALESCE(d."modality", 'flag'), p."jersey_number", p."position", p."secondary_position", CURRENT_TIMESTAMP
FROM "players" p
LEFT JOIN "teams" t ON t."id" = p."team_id"
LEFT JOIN "divisions" d ON d."id" = t."division_id";
