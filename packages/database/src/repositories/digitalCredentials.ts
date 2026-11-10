import { Prisma } from "../generated/prisma/client";
import { getPrismaClient } from "../prisma";
import type { DigitalCredentialCandidateResponseDto } from "@lufa/contracts";

export type CredentialTransaction = Prisma.TransactionClient;

function table(name: "players" | "teams" | "judges" | "users" | "digital_credentials") {
  const databaseUrl = process.env.DATABASE_URL;
  const schema = databaseUrl ? new URL(databaseUrl).searchParams.get("schema") || "public" : "public";
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) throw new Error("Schema PostgreSQL inválido");
  return Prisma.raw(`"${schema}"."${name}"`);
}

export async function nextCredentialMemberNumber(tx: CredentialTransaction, season: number) {
  const prefix = `LUFA-${season}-`;
  const [{ sequence }] = await tx.$queryRaw<[{ sequence: number }]>(Prisma.sql`
    SELECT COALESCE(MAX(substring("member_number" FROM '[0-9]+$')::integer), 0) AS sequence
    FROM ${table("digital_credentials")}
    WHERE "member_number" ~ ${`^${prefix}[0-9]+$`}
  `);
  return `${prefix}${String(sequence + 1).padStart(5, "0")}`;
}

export async function credentialTransaction<T>(work: (tx: CredentialTransaction) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await getPrismaClient().$transaction(work, { isolationLevel: "Serializable" });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) ||
        !["P2002", "P2034"].includes(error.code) || attempt >= 3) throw error;
    }
  }
}

export function normalizeCredentialEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function linkVerifiedCredential(tx: CredentialTransaction, userId: string, email: string) {
  const now = new Date();
  const credentials = await tx.digitalCredential.findMany({
    where: {
      status: "active",
      expiresAt: { gte: now },
      OR: [{ userId }, { userId: null, claimEmail: normalizeCredentialEmail(email) }],
    },
    select: { id: true, userId: true },
    take: 2,
  });
  const [credential] = credentials;
  if (credentials.length !== 1 || !credential || credential.userId) return;

  await tx.digitalCredential.update({ where: { id: credential.id }, data: { userId } });
  await tx.digitalCredentialAudit.create({ data: { credentialId: credential.id, action: "linked_by_email" } });
}

type Candidate = Pick<DigitalCredentialCandidateResponseDto, "id" | "source" | "fullName" | "detail" | "email">;

export async function searchCredentialCandidates(query: string, type: "player" | "official") {
  const normalized = query.trim().slice(0, 120).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalized.length < 2) return [];
  const terms = normalized.split(/\s+/);
  const candidates = type === "player" ? Prisma.sql`
    SELECT p.id, 'player' AS source, concat_ws(' ', p.first_name, p.last_name) AS "fullName",
           t.name AS detail, p.email
    FROM ${table("players")} p JOIN ${table("teams")} t ON t.id = p.team_id
  ` : Prisma.sql`
    SELECT j.id, 'judge' AS source, concat_ws(' ', j.first_name, j.last_name) AS "fullName",
           NULL::text AS detail, NULL::text AS email
    FROM ${table("judges")} j
    UNION ALL
    SELECT t.id || ':' || coach.ordinality, 'coach', coach.value->>'name', t.name, coach.value->>'email'
    FROM ${table("teams")} t
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(t.coaches) = 'array' AND t.coaches <> '[]'::jsonb THEN t.coaches
           WHEN jsonb_typeof(t.coach) = 'object' THEN jsonb_build_array(t.coach)
           ELSE '[]'::jsonb END
    ) WITH ORDINALITY AS coach(value, ordinality)
    UNION ALL
    SELECT u.id, 'account', u.name, NULL, u.email FROM ${table("users")} u WHERE u.is_active
    UNION ALL
    SELECT c.id, 'credential', c.display_name, c.member_number, COALESCE(u.email, c.claim_email)
    FROM ${table("digital_credentials")} c LEFT JOIN ${table("users")} u ON u.id = c.user_id
    WHERE c.status = 'active' AND c.expires_at >= CURRENT_TIMESTAMP
  `;
  return getPrismaClient().$queryRaw<Candidate[]>(Prisma.sql`
    WITH candidates AS (${candidates})
    SELECT id, source, "fullName", detail, email
    FROM candidates
    CROSS JOIN LATERAL (SELECT regexp_replace(normalize(lower("fullName"), NFD), ${"[\u0300-\u036f]"}, '', 'g') AS name) folded
    WHERE ${Prisma.join(terms.map((term) => Prisma.sql`strpos(folded.name, ${term}) > 0`), " AND ")}
    ORDER BY folded.name, source, id
    LIMIT 20
  `);
}
