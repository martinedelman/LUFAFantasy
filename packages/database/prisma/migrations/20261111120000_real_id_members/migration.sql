-- Real ID: miembros con número LUFA estable, membresías pagas, certificaciones y vínculo entrenador-equipo.

CREATE SEQUENCE "lufa_member_number_seq" START 1;

CREATE TABLE "lufa_members" (
    "id" TEXT NOT NULL,
    "lufa_number" TEXT NOT NULL DEFAULT ('LUFA-'::text || lpad((nextval('lufa_member_number_seq'::regclass))::text, 6, '0'::text)),
    "user_id" TEXT,
    "claim_email" TEXT,
    "player_id" TEXT,
    "judge_id" TEXT,
    "display_name" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "nationality_code" TEXT NOT NULL,
    "profile_picture" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "suspended_reason" TEXT,
    "suspended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lufa_members_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "lufa_members_status_check" CHECK ("status" IN ('active', 'suspended'))
);
ALTER SEQUENCE "lufa_member_number_seq" OWNED BY "lufa_members"."lufa_number";

CREATE TABLE "membership_periods" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "order_id" TEXT,
    "method" TEXT,
    "amount_minor" INTEGER,
    "reference" TEXT,
    "recorded_by_id" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "voided_at" TIMESTAMP(3),
    "void_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "membership_periods_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "membership_periods_source_check" CHECK ("source" IN ('store_order', 'offline')),
    CONSTRAINT "membership_periods_status_check" CHECK ("status" IN ('active', 'voided')),
    CONSTRAINT "membership_periods_range_check" CHECK ("ends_at" > "starts_at")
);

CREATE TABLE "member_certifications" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "issuer" TEXT NOT NULL DEFAULT 'LUFA',
    "course_item_id" TEXT,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "revoked_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "member_certifications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "member_certifications_role_check" CHECK ("role" IN ('judge', 'coach')),
    CONSTRAINT "member_certifications_status_check" CHECK ("status" IN ('active', 'revoked'))
);

CREATE TABLE "coach_assignments" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'head',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "coach_assignments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "coach_assignments_role_check" CHECK ("role" IN ('head', 'assistant'))
);

ALTER TABLE "digital_credentials"
  ADD COLUMN "member_id" TEXT,
  ADD COLUMN "roles" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE UNIQUE INDEX "lufa_members_lufa_number_key" ON "lufa_members"("lufa_number");
CREATE UNIQUE INDEX "lufa_members_user_id_key" ON "lufa_members"("user_id");
CREATE UNIQUE INDEX "lufa_members_player_id_key" ON "lufa_members"("player_id");
CREATE UNIQUE INDEX "lufa_members_judge_id_key" ON "lufa_members"("judge_id");
CREATE INDEX "lufa_members_claim_email_idx" ON "lufa_members"("claim_email");
CREATE INDEX "lufa_members_status_idx" ON "lufa_members"("status");
CREATE INDEX "membership_periods_member_id_status_ends_at_idx" ON "membership_periods"("member_id", "status", "ends_at");
CREATE UNIQUE INDEX "membership_periods_order_id_member_id_key" ON "membership_periods"("order_id", "member_id");
CREATE INDEX "member_certifications_member_id_role_status_idx" ON "member_certifications"("member_id", "role", "status");
CREATE INDEX "coach_assignments_team_id_active_idx" ON "coach_assignments"("team_id", "active");
CREATE UNIQUE INDEX "coach_assignments_member_id_team_id_season_key" ON "coach_assignments"("member_id", "team_id", "season");

-- Backfill: un miembro por persona, siguiendo renovaciones, cuenta, ficha de jugador, ficha de juez y correo.
DO $$
DECLARE
  c RECORD;
  m_id TEXT;
  person_email TEXT;
BEGIN
  FOR c IN
    SELECT dc.*, u.email AS user_email
    FROM "digital_credentials" dc
    LEFT JOIN "users" u ON u.id = dc.user_id
    ORDER BY dc.issued_at, dc.id
  LOOP
    m_id := NULL;
    person_email := NULLIF(lower(trim(COALESCE(c.user_email, c.claim_email, ''))), '');
    IF c.renewed_from_id IS NOT NULL THEN
      SELECT member_id INTO m_id FROM "digital_credentials" WHERE id = c.renewed_from_id;
    END IF;
    IF m_id IS NULL AND c.user_id IS NOT NULL THEN SELECT id INTO m_id FROM "lufa_members" WHERE user_id = c.user_id; END IF;
    IF m_id IS NULL AND c.player_id IS NOT NULL THEN SELECT id INTO m_id FROM "lufa_members" WHERE player_id = c.player_id; END IF;
    IF m_id IS NULL AND c.judge_id IS NOT NULL THEN SELECT id INTO m_id FROM "lufa_members" WHERE judge_id = c.judge_id; END IF;
    IF m_id IS NULL AND person_email IS NOT NULL THEN
      SELECT m.id INTO m_id FROM "lufa_members" m LEFT JOIN "users" u ON u.id = m.user_id
      WHERE lower(trim(COALESCE(u.email, m.claim_email, ''))) = person_email
      ORDER BY m.created_at LIMIT 1;
    END IF;

    IF m_id IS NULL THEN
      INSERT INTO "lufa_members" ("id", "user_id", "claim_email", "player_id", "judge_id", "display_name", "date_of_birth",
        "nationality_code", "profile_picture", "created_at", "updated_at")
      VALUES ('mbr' || c.id, c.user_id, CASE WHEN c.user_id IS NULL THEN person_email END, c.player_id, c.judge_id,
        c.display_name, c.date_of_birth, c.nationality_code, c.profile_picture, c.issued_at, CURRENT_TIMESTAMP)
      RETURNING id INTO m_id;
    ELSE
      UPDATE "lufa_members" SET
        "display_name" = c.display_name, "date_of_birth" = c.date_of_birth, "nationality_code" = c.nationality_code,
        "profile_picture" = COALESCE(c.profile_picture, "profile_picture"), "updated_at" = CURRENT_TIMESTAMP
      WHERE id = m_id;
      IF c.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "lufa_members" WHERE user_id = c.user_id) THEN
        UPDATE "lufa_members" SET "user_id" = c.user_id, "claim_email" = NULL WHERE id = m_id AND user_id IS NULL;
      END IF;
      IF c.player_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "lufa_members" WHERE player_id = c.player_id) THEN
        UPDATE "lufa_members" SET "player_id" = c.player_id WHERE id = m_id AND player_id IS NULL;
      END IF;
      IF c.judge_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "lufa_members" WHERE judge_id = c.judge_id) THEN
        UPDATE "lufa_members" SET "judge_id" = c.judge_id WHERE id = m_id AND judge_id IS NULL;
      END IF;
    END IF;

    UPDATE "digital_credentials" SET
      "member_id" = m_id,
      "roles" = (
        WITH labels AS (
          SELECT lower(trim(label)) AS label
          FROM regexp_split_to_table(c.role_label, '[,;/|·]') AS label
        ), mapped AS (
          SELECT CASE
            WHEN label IN ('jugador', 'jugadora', 'player') THEN 'player'
            WHEN label IN ('juez', 'jueza', 'judge', 'árbitro', 'arbitro', 'árbitra', 'arbitra', 'referee') THEN 'judge'
            WHEN label IN ('entrenador', 'entrenadora', 'coach') THEN 'coach'
          END AS role
          FROM labels
        ), found AS (
          SELECT ARRAY(
            SELECT v.role FROM (VALUES ('player', 1), ('judge', 2), ('coach', 3)) AS v(role, ord)
            WHERE v.role IN (SELECT role FROM mapped) ORDER BY v.ord
          ) AS roles
        )
        SELECT CASE WHEN cardinality(found.roles) > 0 THEN found.roles
          WHEN c.subject_type = 'player' THEN ARRAY['player']::TEXT[]
          ELSE ARRAY['judge']::TEXT[] END
        FROM found
      )
    WHERE id = c.id;
  END LOOP;
END $$;

-- Nadie pierde vigencia al desplegar: la credencial vigente se convierte en membresía y certificaciones explícitas.
INSERT INTO "membership_periods" ("id", "member_id", "source", "method", "reference", "starts_at", "ends_at", "created_at")
SELECT DISTINCT ON (dc.member_id)
  'mbp' || dc.id, dc.member_id, 'offline', 'backfill', 'Migración de credencial vigente ' || dc.member_number,
  LEAST(dc.issued_at, CURRENT_TIMESTAMP), dc.expires_at, CURRENT_TIMESTAMP
FROM "digital_credentials" dc
WHERE dc.status = 'active' AND dc.expires_at > CURRENT_TIMESTAMP AND 'player' = ANY(dc.roles)
ORDER BY dc.member_id, dc.expires_at DESC;

INSERT INTO "member_certifications" ("id", "member_id", "role", "level", "issuer", "issued_at", "expires_at", "notes", "updated_at")
SELECT DISTINCT ON (dc.member_id, r.role)
  'mct' || r.role || dc.id, dc.member_id, r.role, '1', 'LUFA', dc.issued_at, dc.expires_at,
  'Migrado desde la credencial ' || dc.member_number, CURRENT_TIMESTAMP
FROM "digital_credentials" dc
CROSS JOIN LATERAL unnest(dc.roles) AS r(role)
WHERE dc.status = 'active' AND dc.expires_at > CURRENT_TIMESTAMP AND r.role IN ('judge', 'coach')
ORDER BY dc.member_id, r.role, dc.expires_at DESC;

ALTER TABLE "digital_credentials" ALTER COLUMN "member_id" SET NOT NULL;
CREATE INDEX "digital_credentials_member_id_status_idx" ON "digital_credentials"("member_id", "status");

ALTER TABLE "digital_credentials" ADD CONSTRAINT "digital_credentials_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "lufa_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lufa_members" ADD CONSTRAINT "lufa_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lufa_members" ADD CONSTRAINT "lufa_members_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lufa_members" ADD CONSTRAINT "lufa_members_judge_id_fkey" FOREIGN KEY ("judge_id") REFERENCES "judges"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "membership_periods" ADD CONSTRAINT "membership_periods_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "lufa_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_certifications" ADD CONSTRAINT "member_certifications_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "lufa_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "coach_assignments" ADD CONSTRAINT "coach_assignments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "lufa_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "coach_assignments" ADD CONSTRAINT "coach_assignments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
