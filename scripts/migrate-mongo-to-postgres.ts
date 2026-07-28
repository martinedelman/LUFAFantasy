import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import mongoose from "mongoose";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";

type Document = Record<string, any>;

const COLLECTIONS = {
  users: "users",
  tournaments: "tournaments",
  divisions: "divisions",
  teams: "teams",
  players: "players",
  judges: "judges",
  games: "games",
  gameEvents: "game_events",
  standings: "standings",
  playerStatistics: "player_statistics",
  teamStatistics: "team_statistics",
  otpVerifications: "otpverifications",
  gameEventCorrections: "game_event_corrections",
  playerImportMigrations: "player_import_migrations",
  siteSettings: "site_settings",
  flagInterests: "flaginterests",
  adminAuditLogs: "admin_audit_logs",
} as const;

const IGNORED_COLLECTIONS = ["venues", "seasons"] as const;
const KNOWN_COLLECTIONS = new Set<string>([...Object.values(COLLECTIONS), ...IGNORED_COLLECTIONS]);

interface Options {
  sourceDb: string;
  apply: boolean;
  batchSize: number;
  reportPath: string;
  allowExtraTarget: boolean;
}

interface MigrationReport {
  mode: "dry-run" | "apply";
  sourceDatabase: string;
  targetDatabase: string;
  startedAt: string;
  completedAt?: string;
  sourceCounts: Record<string, number>;
  targetCounts: Record<string, number>;
  issues: string[];
  warnings: string[];
}

function parseOptions(argv: string[]): Options {
  const value = (name: string) => {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const sourceDb = value("--source-db");
  if (!sourceDb) throw new Error("Uso: --source-db <nombre> [--dry-run|--apply] [--batch-size 500] [--report ruta]");
  if (argv.includes("--apply") && argv.includes("--dry-run")) {
    throw new Error("Use --apply o --dry-run, no ambos");
  }
  const batchSize = Number(value("--batch-size") || 500);
  if (!Number.isInteger(batchSize) || batchSize < 1) throw new Error("--batch-size debe ser un entero positivo");
  return {
    sourceDb,
    apply: argv.includes("--apply"),
    batchSize,
    reportPath: value("--report") || "mongo-postgres-migration-report.json",
    allowExtraTarget: argv.includes("--allow-extra-target"),
  };
}

type CollectionKey = keyof typeof COLLECTIONS;
type MigrationClient = PrismaClient | Prisma.TransactionClient;

class SourceSnapshot {
  readonly directory: string;
  readonly counts: Record<CollectionKey, number>;

  constructor(directory: string) {
    this.directory = directory;
    this.counts = Object.fromEntries(Object.keys(COLLECTIONS).map((key) => [key, 0])) as Record<CollectionKey, number>;
  }

  file(key: CollectionKey) {
    return path.join(this.directory, `${key}.ndjson`);
  }

  async append(key: CollectionKey, rows: Document[]) {
    if (!rows.length) return;
    const payload = rows.map((row) => JSON.stringify(row)).join("\n");
    await fs.appendFile(this.file(key), `${payload}\n`, "utf8");
    this.counts[key] += rows.length;
  }

  async *batches(key: CollectionKey, batchSize: number): AsyncGenerator<Document[]> {
    const input = createReadStream(this.file(key), { encoding: "utf8" });
    const lines = readline.createInterface({ input, crlfDelay: Infinity });
    let batch: Document[] = [];
    for await (const line of lines) {
      if (!line.trim()) continue;
      batch.push(JSON.parse(line) as Document);
      if (batch.length >= batchSize) {
        yield batch;
        batch = [];
      }
    }
    if (batch.length) yield batch;
  }
}

interface Sanitization {
  divisionTournament: Set<string>;
  teamTournament: Set<string>;
  eventPlayer: Set<string>;
  correctionEvent: Set<string>;
  correctionReviewer: Set<string>;
  importPlayer: Set<string>;
}

function emptySanitization(): Sanitization {
  return {
    divisionTournament: new Set(),
    teamTournament: new Set(),
    eventPlayer: new Set(),
    correctionEvent: new Set(),
    correctionReviewer: new Set(),
    importPlayer: new Set(),
  };
}

function id(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  if (typeof value === "object" && value && (value as { _bsontype?: string })._bsontype === "ObjectId") {
    return String(value);
  }
  if (typeof value === "object" && value && "_id" in value) return id((value as { _id: unknown })._id);
  return String(value);
}

function date(value: unknown, fallback = new Date()): Date {
  if (!value) return fallback;
  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function json(value: unknown): any {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(
    JSON.stringify(value, (_key, nested) => {
      if (nested instanceof mongoose.Types.ObjectId) return nested.toString();
      if (nested && typeof nested === "object" && nested._bsontype === "ObjectId") return nested.toString();
      return nested;
    }),
  );
}

function jsonField(name: string, value: unknown): Record<string, unknown> {
  const converted = json(value);
  return converted === undefined ? {} : { [name]: converted };
}

function refs(values: unknown): string[] {
  return Array.isArray(values) ? values.map(id).filter(Boolean) : [];
}

function normalizeName(...values: unknown[]): string {
  return values.map((value) => String(value || "").trim()).join(" ").replace(/\s+/g, " ").toLowerCase();
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const mongoUri = process.env.MONGODB_URI;
  const databaseUrl = process.env.DATABASE_URL;
  if (!mongoUri) throw new Error("MONGODB_URI es requerida");
  if (!databaseUrl) throw new Error("DATABASE_URL es requerida");

  const mongo = new mongoose.mongo.MongoClient(mongoUri, { readPreference: "primary" });
  const configuredSchema = new URL(databaseUrl).searchParams.get("schema");
  const prisma = new PrismaClient({
    adapter: new PrismaPg(
      { connectionString: databaseUrl },
      configuredSchema ? { schema: configuredSchema } : undefined,
    ),
  });
  const report: MigrationReport = {
    mode: options.apply ? "apply" : "dry-run",
    sourceDatabase: options.sourceDb,
    targetDatabase: new URL(databaseUrl).pathname.replace(/^\//, ""),
    startedAt: new Date().toISOString(),
    sourceCounts: {},
    targetCounts: {},
    issues: [],
    warnings: [],
  };
  let snapshot: SourceSnapshot | undefined;

  try {
    await mongo.connect();
    const db = mongo.db(options.sourceDb);
    const existingCollections = (await db.listCollections({}, { nameOnly: true }).toArray()).map((item) => item.name);
    const unknown = existingCollections.filter((name) => !KNOWN_COLLECTIONS.has(name) && !name.startsWith("system."));
    if (unknown.length) report.issues.push(`Colecciones no modeladas: ${unknown.join(", ")}`);

    snapshot = await createSourceSnapshot(db, existingCollections, options.batchSize);
    await includeLegacyGameEvents(snapshot, report, options.batchSize);
    for (const [key, collectionName] of Object.entries(COLLECTIONS) as Array<[CollectionKey, string]>) {
      report.sourceCounts[collectionName] = snapshot.counts[key];
    }
    for (const collectionName of IGNORED_COLLECTIONS) {
      const count = existingCollections.includes(collectionName)
        ? await db.collection(collectionName).countDocuments()
        : 0;
      report.sourceCounts[collectionName] = count;
      if (count) {
        report.warnings.push(
          `${collectionName}: se omitieron ${count} documento(s) porque no tienen consumidores en la aplicación`,
        );
      }
    }

    const sanitization = await preflight(snapshot, report, options.batchSize);
    if (options.apply) {
      await preflightTarget(prisma, snapshot, report, options.batchSize, options.allowExtraTarget, sanitization);
    }
    printSummary(report);
    if (report.issues.length) throw new Error(`Preflight falló con ${report.issues.length} problema(s)`);

    if (options.apply) {
      await prisma.$transaction(
        async (tx) => migrateAll(tx, snapshot!, options.batchSize, sanitization),
        { maxWait: 60_000, timeout: 60 * 60 * 1000 },
      );
      report.targetCounts = await targetCounts(prisma);
      await verifyMigration(prisma, snapshot, report, options.batchSize, options.allowExtraTarget, sanitization);
    } else {
      report.warnings.push("Dry-run: no se escribieron datos en PostgreSQL");
    }
    report.completedAt = new Date().toISOString();
    await fs.writeFile(options.reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    printSummary(report);
    if (report.issues.length) throw new Error(`Verificación falló con ${report.issues.length} problema(s)`);
  } catch (error) {
    report.completedAt = new Date().toISOString();
    report.issues.push(error instanceof Error ? error.message : String(error));
    await fs.writeFile(options.reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    throw error;
  } finally {
    await Promise.allSettled([mongo.close(), prisma.$disconnect()]);
    if (snapshot) await fs.rm(snapshot.directory, { recursive: true, force: true });
  }
}

async function createSourceSnapshot(
  db: mongoose.mongo.Db,
  existingCollections: string[],
  batchSize: number,
): Promise<SourceSnapshot> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "lufa-mongo-postgres-"));
  const snapshot = new SourceSnapshot(directory);
  for (const [key, collectionName] of Object.entries(COLLECTIONS) as Array<[CollectionKey, string]>) {
    await fs.writeFile(snapshot.file(key), "", "utf8");
    if (!existingCollections.includes(collectionName)) continue;
    const cursor = db.collection(collectionName).find({}).batchSize(batchSize);
    let batch: Document[] = [];
    for await (const row of cursor) {
      batch.push(row as Document);
      if (batch.length >= batchSize) {
        await snapshot.append(key, batch);
        batch = [];
      }
    }
    await snapshot.append(key, batch);
  }
  return snapshot;
}

async function includeLegacyGameEvents(snapshot: SourceSnapshot, report: MigrationReport, batchSize: number) {
  const gamesWithCanonical = new Set<string>();
  for await (const batch of snapshot.batches("gameEvents", batchSize)) {
    for (const event of batch) gamesWithCanonical.add(id(event.game));
  }
  let imported = 0;
  for await (const batch of snapshot.batches("games", batchSize)) {
    const legacy: Document[] = [];
    for (const game of batch) {
      const gameId = id(game._id);
      if (gamesWithCanonical.has(gameId) || !Array.isArray(game.events)) continue;
      game.events.forEach((event: Document, sequence: number) => {
        legacy.push({
          ...event,
          _id: event._id || `${gameId}:legacy:${sequence}`,
          game: game._id,
          tournament: game.tournament,
          division: game.division,
          sequence,
          createdAt: event.createdAt || game.createdAt,
          updatedAt: event.updatedAt || game.updatedAt,
        });
      });
    }
    imported += legacy.length;
    await snapshot.append("gameEvents", legacy);
  }
  if (imported) report.warnings.push(`Se normalizaron ${imported} eventos embebidos legacy`);
}

async function preflight(
  snapshot: SourceSnapshot,
  report: MigrationReport,
  batchSize: number,
): Promise<Sanitization> {
  const sanitization = emptySanitization();
  const indexedKeys: CollectionKey[] = [
    "users",
    "tournaments",
    "divisions",
    "teams",
    "players",
    "judges",
    "games",
    "gameEvents",
  ];
  const sets = Object.fromEntries(indexedKeys.map((key) => [key, new Set<string>()])) as Record<string, Set<string>>;
  for (const key of indexedKeys) {
    for await (const batch of snapshot.batches(key, batchSize)) {
      for (const row of batch) sets[key].add(id(row._id));
    }
  }

  const requireRef = (collection: string, rowId: string, field: string, target: string, value: unknown) => {
    const reference = id(value);
    if (!reference || !sets[target]?.has(reference)) {
      report.issues.push(`${collection}.${rowId}: referencia ${field} inválida (${reference || "vacía"})`);
      return false;
    }
    return true;
  };
  const optionalRef = (
    collection: string,
    rowId: string,
    field: string,
    target: string,
    value: unknown,
    sanitized: Set<string>,
  ) => {
    const reference = id(value);
    if (reference && !sets[target]?.has(reference)) {
      report.warnings.push(`${collection}.${rowId}: se omitió ${field} inexistente (${reference})`);
      sanitized.add(rowId);
    }
  };
  const duplicateSets = new Map<string, Set<string>>();
  const duplicate = (label: string, value: string) => {
    if (!value) return;
    const seen = duplicateSets.get(label) || new Set<string>();
    if (seen.has(value)) report.issues.push(`Duplicado para ${label}: ${value}`);
    seen.add(value);
    duplicateSets.set(label, seen);
  };

  const process = async (key: CollectionKey, callback: (row: Document) => void) => {
    for await (const batch of snapshot.batches(key, batchSize)) {
      for (const row of batch) callback(row);
    }
  };

  await process("users", (row) => duplicate("users.email", String(row.email || "").trim().toLowerCase()));
  await process("tournaments", (row) => {
    duplicate("tournaments.name+year", `${String(row.name || "")}:${Number(row.year)}`);
    for (const divisionId of refs(row.divisions)) {
      requireRef("tournaments", id(row._id), "divisions", "divisions", divisionId);
    }
    for (const teamId of refs(row.participatingTeams)) {
      requireRef("tournaments", id(row._id), "participatingTeams", "teams", teamId);
    }
  });
  await process("divisions", (row) => {
    const rowId = id(row._id);
    optionalRef("divisions", rowId, "tournament", "tournaments", row.tournament, sanitization.divisionTournament);
    for (const teamId of refs(row.teams)) requireRef("divisions", rowId, "teams", "teams", teamId);
  });
  await process("teams", (row) => {
    const rowId = id(row._id);
    requireRef("teams", rowId, "division", "divisions", row.division);
    optionalRef("teams", rowId, "tournament", "tournaments", row.tournament, sanitization.teamTournament);
    duplicate("teams.name+division", `${String(row.name || "")}:${id(row.division)}`);
    for (const playerId of refs(row.players)) requireRef("teams", rowId, "players", "players", playerId);
  });
  await process("players", (row) => requireRef("players", id(row._id), "team", "teams", row.team));
  await process("judges", (row) =>
    duplicate("judges.normalized_name", normalizeName(row.firstName, row.lastName)),
  );
  await process("games", (row) => {
    const rowId = id(row._id);
    requireRef("games", rowId, "tournament", "tournaments", row.tournament);
    requireRef("games", rowId, "division", "divisions", row.division);
    if (row.homeTeam) requireRef("games", rowId, "homeTeam", "teams", row.homeTeam);
    if (row.awayTeam) requireRef("games", rowId, "awayTeam", "teams", row.awayTeam);
    for (const playerId of [...refs(row.presentPlayers?.home), ...refs(row.presentPlayers?.away)]) {
      requireRef("games", rowId, "presentPlayers", "players", playerId);
    }
  });
  await process("gameEvents", (row) => {
    const rowId = id(row._id);
    requireRef("game_events", rowId, "game", "games", row.game);
    requireRef("game_events", rowId, "team", "teams", row.team);
    optionalRef("game_events", rowId, "player", "players", row.player, sanitization.eventPlayer);
    duplicate("game_events.game+sequence", `${id(row.game)}:${Number(row.sequence || 0)}`);
  });
  await process("standings", (row) => {
    const rowId = id(row._id);
    requireRef("standings", rowId, "division", "divisions", row.division);
    requireRef("standings", rowId, "tournament", "tournaments", row.tournament);
    requireRef("standings", rowId, "team", "teams", row.team);
    duplicate("standings.identity", `${id(row.division)}:${id(row.tournament)}:${id(row.team)}`);
  });
  await process("playerStatistics", (row) => {
    const rowId = id(row._id);
    requireRef("player_statistics", rowId, "player", "players", row.player);
    requireRef("player_statistics", rowId, "tournament", "tournaments", row.tournament);
    requireRef("player_statistics", rowId, "division", "divisions", row.division);
    duplicate("player_statistics.identity", `${id(row.player)}:${id(row.tournament)}:${id(row.division)}`);
  });
  await process("teamStatistics", (row) => {
    const rowId = id(row._id);
    requireRef("team_statistics", rowId, "team", "teams", row.team);
    requireRef("team_statistics", rowId, "tournament", "tournaments", row.tournament);
    requireRef("team_statistics", rowId, "division", "divisions", row.division);
    duplicate("team_statistics.identity", `${id(row.team)}:${id(row.tournament)}:${id(row.division)}`);
  });
  await process("otpVerifications", (row) => {
    requireRef("otp", id(row._id), "userId", "users", row.userId);
    duplicate("otp.tokenHash", String(row.tokenHash || ""));
  });
  await process("gameEventCorrections", (row) => {
    const rowId = id(row._id);
    requireRef("corrections", rowId, "game", "games", row.game);
    requireRef("corrections", rowId, "requestedBy", "users", row.requestedBy);
    optionalRef("corrections", rowId, "event", "gameEvents", row.event, sanitization.correctionEvent);
    optionalRef("corrections", rowId, "reviewedBy", "users", row.reviewedBy, sanitization.correctionReviewer);
  });
  await process("playerImportMigrations", (row) => {
    const rowId = id(row._id);
    duplicate("player_import_migrations.sourceKey", String(row.sourceKey || ""));
    optionalRef("player_import_migrations", rowId, "playerId", "players", row.playerId, sanitization.importPlayer);
  });
  await process("siteSettings", (row) => duplicate("site_settings.key", String(row.key || "global")));
  await process("adminAuditLogs", (row) =>
    requireRef("audit", id(row._id), "actorId", "users", row.actorId),
  );

  return sanitization;
}

async function preflightTarget(
  prisma: PrismaClient,
  snapshot: SourceSnapshot,
  report: MigrationReport,
  batchSize: number,
  allowExtraTarget: boolean,
  sanitization: Sanitization,
) {
  for (const key of Object.keys(COLLECTIONS) as CollectionKey[]) {
    let matchingTargetIds = 0;
    for await (const batch of snapshot.batches(key, batchSize)) {
      const sanitized = batch.map((row) => sanitizeRow(key, row, sanitization));
      const identities = sanitized.map((row) => sourceIdentity(key, row));
      const targetRows = await fetchTargetRows(prisma, key, identities);
      matchingTargetIds += targetRows.length;

      const naturalTargetRows = await fetchTargetByNaturalKeys(prisma, key, sanitized);
      const targetByNaturalKey = new Map(
        naturalTargetRows.map((row) => [naturalKeyFromTarget(key, row), targetIdentity(key, row)]),
      );
      for (const row of sanitized) {
        const naturalKey = naturalKeyFromSource(key, row);
        if (!naturalKey) continue;
        const conflictingId = targetByNaturalKey.get(naturalKey);
        const expectedId = sourceIdentity(key, row);
        if (conflictingId && conflictingId !== expectedId) {
          report.issues.push(
            `${COLLECTIONS[key]}: clave única ${naturalKey} ya pertenece a ${conflictingId} en PostgreSQL`,
          );
        }
      }
    }
    const targetCount = await targetCountForKey(prisma, key);
    if (!allowExtraTarget && targetCount > matchingTargetIds) {
      report.issues.push(
        `${COLLECTIONS[key]}: PostgreSQL contiene ${targetCount - matchingTargetIds} fila(s) ajenas al origen; ` +
          "vacíe el destino o use --allow-extra-target conscientemente",
      );
    }
  }
}

async function verifyMigration(
  prisma: PrismaClient,
  snapshot: SourceSnapshot,
  report: MigrationReport,
  batchSize: number,
  allowExtraTarget: boolean,
  sanitization: Sanitization,
) {
  for (const key of Object.keys(COLLECTIONS) as CollectionKey[]) {
    let matched = 0;
    for await (const batch of snapshot.batches(key, batchSize)) {
      const sanitized = batch.map((row) => sanitizeRow(key, row, sanitization));
      const identities = sanitized.map((row) => sourceIdentity(key, row));
      const targetRows = await fetchTargetRows(prisma, key, identities);
      matched += targetRows.length;
      const targetById = new Map(targetRows.map((row) => [targetIdentity(key, row), row]));
      for (const row of sanitized) {
        const identity = sourceIdentity(key, row);
        const target = targetById.get(identity);
        if (!target) {
          report.issues.push(`${COLLECTIONS[key]}.${identity}: falta en PostgreSQL`);
          continue;
        }
        const expected = sourceMappedData(key, row);
        const mismatched = Object.entries(expected)
          .filter(([, value]) => value !== undefined)
          .map(([field, value]) => field)
          .filter((field) => stableValue(target[field]) !== stableValue(expected[field]));
        if (mismatched.length) {
          report.issues.push(
            `${COLLECTIONS[key]}.${identity}: campos diferentes (${mismatched.slice(0, 8).join(", ")})`,
          );
        }
      }
    }
    const targetCount = await targetCountForKey(prisma, key);
    if (matched !== snapshot.counts[key]) {
      report.issues.push(`${COLLECTIONS[key]}: origen=${snapshot.counts[key]}, IDs encontrados=${matched}`);
    }
    if (!allowExtraTarget && targetCount !== snapshot.counts[key]) {
      report.issues.push(`${COLLECTIONS[key]}: origen=${snapshot.counts[key]}, destino=${targetCount}`);
    } else if (allowExtraTarget && targetCount > snapshot.counts[key]) {
      report.warnings.push(`${COLLECTIONS[key]}: destino contiene ${targetCount - snapshot.counts[key]} fila(s) adicionales`);
    }
  }
  await verifyMemberships(prisma, snapshot, report, batchSize);
}

function sourceIdentity(key: CollectionKey, row: Document): string {
  if (key === "playerImportMigrations") return String(row.sourceKey || "");
  if (key === "siteSettings") return String(row.key || "global");
  return id(row._id);
}

function targetIdentity(key: CollectionKey, row: Document): string {
  if (key === "playerImportMigrations") return String(row.sourceKey || "");
  if (key === "siteSettings") return String(row.key || "global");
  return String(row.id || "");
}

function naturalKeyFromSource(key: CollectionKey, row: Document): string {
  switch (key) {
    case "users":
      return String(row.email || "").trim().toLowerCase();
    case "tournaments":
      return `${String(row.name || "")}:${Number(row.year)}`;
    case "teams":
      return `${String(row.name || "")}:${id(row.division)}`;
    case "judges":
      return normalizeName(row.firstName, row.lastName);
    case "gameEvents":
      return `${id(row.game)}:${Number(row.sequence || 0)}`;
    case "standings":
      return `${id(row.division)}:${id(row.tournament)}:${id(row.team)}`;
    case "playerStatistics":
      return `${id(row.player)}:${id(row.tournament)}:${id(row.division)}`;
    case "teamStatistics":
      return `${id(row.team)}:${id(row.tournament)}:${id(row.division)}`;
    case "otpVerifications":
      return String(row.tokenHash || "");
    case "playerImportMigrations":
      return String(row.sourceKey || "");
    case "siteSettings":
      return String(row.key || "global");
    default:
      return "";
  }
}

function naturalKeyFromTarget(key: CollectionKey, row: Document): string {
  switch (key) {
    case "users":
      return String(row.email || "").trim().toLowerCase();
    case "tournaments":
      return `${String(row.name || "")}:${Number(row.year)}`;
    case "teams":
      return `${String(row.name || "")}:${String(row.divisionId || "")}`;
    case "judges":
      return String(row.normalizedName || "");
    case "gameEvents":
      return `${String(row.gameId || "")}:${Number(row.sequence || 0)}`;
    case "standings":
      return `${String(row.divisionId || "")}:${String(row.tournamentId || "")}:${String(row.teamId || "")}`;
    case "playerStatistics":
      return `${String(row.playerId || "")}:${String(row.tournamentId || "")}:${String(row.divisionId || "")}`;
    case "teamStatistics":
      return `${String(row.teamId || "")}:${String(row.tournamentId || "")}:${String(row.divisionId || "")}`;
    case "otpVerifications":
      return String(row.tokenHash || "");
    case "playerImportMigrations":
      return String(row.sourceKey || "");
    case "siteSettings":
      return String(row.key || "global");
    default:
      return "";
  }
}

async function fetchTargetByNaturalKeys(
  prisma: PrismaClient,
  key: CollectionKey,
  rows: Document[],
): Promise<Document[]> {
  if (!rows.length) return [];
  switch (key) {
    case "users":
      return prisma.user.findMany({ where: { email: { in: rows.map((row) => String(row.email || "").trim().toLowerCase()) } } }) as any;
    case "tournaments":
      return prisma.tournament.findMany({
        where: { OR: rows.map((row) => ({ name: String(row.name || ""), year: Number(row.year) })) },
      }) as any;
    case "teams":
      return prisma.team.findMany({
        where: { OR: rows.map((row) => ({ name: String(row.name || ""), divisionId: id(row.division) })) },
      }) as any;
    case "judges":
      return prisma.judge.findMany({
        where: { normalizedName: { in: rows.map((row) => normalizeName(row.firstName, row.lastName)) } },
      }) as any;
    case "gameEvents":
      return prisma.gameEvent.findMany({
        where: { OR: rows.map((row) => ({ gameId: id(row.game), sequence: Number(row.sequence || 0) })) },
      }) as any;
    case "standings":
      return prisma.standing.findMany({
        where: {
          OR: rows.map((row) => ({
            divisionId: id(row.division),
            tournamentId: id(row.tournament),
            teamId: id(row.team),
          })),
        },
      }) as any;
    case "playerStatistics":
      return prisma.playerStatistics.findMany({
        where: {
          OR: rows.map((row) => ({
            playerId: id(row.player),
            tournamentId: id(row.tournament),
            divisionId: id(row.division),
          })),
        },
      }) as any;
    case "teamStatistics":
      return prisma.teamStatistics.findMany({
        where: {
          OR: rows.map((row) => ({
            teamId: id(row.team),
            tournamentId: id(row.tournament),
            divisionId: id(row.division),
          })),
        },
      }) as any;
    case "otpVerifications":
      return prisma.otpVerification.findMany({
        where: { tokenHash: { in: rows.map((row) => String(row.tokenHash || "")) } },
      }) as any;
    case "playerImportMigrations":
      return prisma.playerImportMigration.findMany({
        where: { sourceKey: { in: rows.map((row) => String(row.sourceKey || "")) } },
      }) as any;
    case "siteSettings":
      return prisma.siteSettings.findMany({
        where: { key: { in: rows.map((row) => String(row.key || "global")) } },
      }) as any;
    default:
      return [];
  }
}

async function fetchTargetRows(
  prisma: PrismaClient,
  key: CollectionKey,
  identities: string[],
): Promise<Document[]> {
  if (!identities.length) return [];
  switch (key) {
    case "users": return prisma.user.findMany({ where: { id: { in: identities } } }) as any;
    case "tournaments": return prisma.tournament.findMany({ where: { id: { in: identities } } }) as any;
    case "divisions": return prisma.division.findMany({ where: { id: { in: identities } } }) as any;
    case "teams": return prisma.team.findMany({ where: { id: { in: identities } } }) as any;
    case "players": return prisma.player.findMany({ where: { id: { in: identities } } }) as any;
    case "judges": return prisma.judge.findMany({ where: { id: { in: identities } } }) as any;
    case "games": return prisma.game.findMany({ where: { id: { in: identities } } }) as any;
    case "gameEvents": return prisma.gameEvent.findMany({ where: { id: { in: identities } } }) as any;
    case "standings": return prisma.standing.findMany({ where: { id: { in: identities } } }) as any;
    case "playerStatistics": return prisma.playerStatistics.findMany({ where: { id: { in: identities } } }) as any;
    case "teamStatistics": return prisma.teamStatistics.findMany({ where: { id: { in: identities } } }) as any;
    case "otpVerifications": return prisma.otpVerification.findMany({ where: { id: { in: identities } } }) as any;
    case "gameEventCorrections": return prisma.gameEventCorrection.findMany({ where: { id: { in: identities } } }) as any;
    case "playerImportMigrations": return prisma.playerImportMigration.findMany({ where: { sourceKey: { in: identities } } }) as any;
    case "siteSettings": return prisma.siteSettings.findMany({ where: { key: { in: identities } } }) as any;
    case "flagInterests": return prisma.flagInterest.findMany({ where: { id: { in: identities } } }) as any;
    case "adminAuditLogs": return prisma.adminAuditLog.findMany({ where: { id: { in: identities } } }) as any;
  }
}

async function targetCountForKey(prisma: PrismaClient, key: CollectionKey): Promise<number> {
  switch (key) {
    case "users": return prisma.user.count();
    case "tournaments": return prisma.tournament.count();
    case "divisions": return prisma.division.count();
    case "teams": return prisma.team.count();
    case "players": return prisma.player.count();
    case "judges": return prisma.judge.count();
    case "games": return prisma.game.count();
    case "gameEvents": return prisma.gameEvent.count();
    case "standings": return prisma.standing.count();
    case "playerStatistics": return prisma.playerStatistics.count();
    case "teamStatistics": return prisma.teamStatistics.count();
    case "otpVerifications": return prisma.otpVerification.count();
    case "gameEventCorrections": return prisma.gameEventCorrection.count();
    case "playerImportMigrations": return prisma.playerImportMigration.count();
    case "siteSettings": return prisma.siteSettings.count();
    case "flagInterests": return prisma.flagInterest.count();
    case "adminAuditLogs": return prisma.adminAuditLog.count();
  }
}

function sourceMappedData(key: CollectionKey, row: Document): Document {
  switch (key) {
    case "users": return userData(row, false);
    case "tournaments": return tournamentData(row, false);
    case "divisions": return divisionData(row, false);
    case "teams": return teamData(row, false);
    case "players": return playerData(row, false);
    case "judges":
      return {
        firstName: String(row.firstName),
        lastName: String(row.lastName),
        normalizedName: normalizeName(row.firstName, row.lastName),
        ...(row.createdAt ? { createdAt: date(row.createdAt) } : {}),
        ...(row.updatedAt ? { updatedAt: date(row.updatedAt) } : {}),
      };
    case "games": return gameData(row, false);
    case "gameEvents": return eventData(row, false);
    case "standings": return standingData(row, false);
    case "playerStatistics": return playerStatsData(row, false);
    case "teamStatistics": return teamStatsData(row, false);
    case "otpVerifications": return otpData(row, false);
    case "gameEventCorrections": return correctionData(row, false);
    case "playerImportMigrations": return importData(row);
    case "siteSettings": return settingsData(row);
    case "flagInterests": return interestData(row, false);
    case "adminAuditLogs": return auditData(row, false);
  }
}

function stableValue(value: unknown): string {
  const normalize = (nested: unknown): unknown => {
    if (nested instanceof Date) return nested.toISOString();
    if (Array.isArray(nested)) return nested.map(normalize);
    if (nested && typeof nested === "object") {
      return Object.fromEntries(
        Object.entries(nested as Record<string, unknown>)
          .filter(([, item]) => item !== undefined)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, item]) => [key, normalize(item)]),
      );
    }
    return nested;
  };
  return JSON.stringify(normalize(value));
}

async function verifyMemberships(
  prisma: PrismaClient,
  snapshot: SourceSnapshot,
  report: MigrationReport,
  batchSize: number,
) {
  const verify = async (
    key: "tournaments" | "divisions" | "teams" | "games",
    expectedForRow: (row: Document) => Array<{ identity: string; ordinal: number }>,
    fetch: (parentIds: string[]) => Promise<Array<{ identity: string; ordinal: number }>>,
  ) => {
    for await (const batch of snapshot.batches(key, batchSize)) {
      const expected = batch.flatMap(expectedForRow);
      const actual = await fetch(batch.map((row) => id(row._id)));
      const actualByIdentity = new Map(actual.map((row) => [row.identity, row.ordinal]));
      if (actual.length !== expected.length) {
        report.issues.push(`${key}: relaciones esperadas=${expected.length}, destino=${actual.length}`);
      }
      for (const row of expected) {
        if (actualByIdentity.get(row.identity) !== row.ordinal) {
          report.issues.push(`${key}: relación faltante o desordenada (${row.identity})`);
        }
      }
    }
  };

  await verify(
    "tournaments",
    (row) => [
      ...refs(row.divisions).map((divisionId, ordinal) => ({ identity: `division:${id(row._id)}:${divisionId}`, ordinal })),
      ...refs(row.participatingTeams).map((teamId, ordinal) => ({ identity: `team:${id(row._id)}:${teamId}`, ordinal })),
    ],
    async (ids) => {
      const [divisions, teams] = await Promise.all([
        prisma.tournamentDivision.findMany({ where: { tournamentId: { in: ids } } }),
        prisma.tournamentTeam.findMany({ where: { tournamentId: { in: ids } } }),
      ]);
      return [
        ...divisions.map((row) => ({ identity: `division:${row.tournamentId}:${row.divisionId}`, ordinal: row.ordinal })),
        ...teams.map((row) => ({ identity: `team:${row.tournamentId}:${row.teamId}`, ordinal: row.ordinal })),
      ];
    },
  );
  await verify(
    "divisions",
    (row) => refs(row.teams).map((teamId, ordinal) => ({ identity: `${id(row._id)}:${teamId}`, ordinal })),
    async (ids) =>
      (await prisma.divisionTeam.findMany({ where: { divisionId: { in: ids } } })).map((row) => ({
        identity: `${row.divisionId}:${row.teamId}`,
        ordinal: row.ordinal,
      })),
  );
  await verify(
    "teams",
    (row) => refs(row.players).map((playerId, ordinal) => ({ identity: `${id(row._id)}:${playerId}`, ordinal })),
    async (ids) =>
      (await prisma.teamPlayer.findMany({ where: { teamId: { in: ids } } })).map((row) => ({
        identity: `${row.teamId}:${row.playerId}`,
        ordinal: row.ordinal,
      })),
  );
  await verify(
    "games",
    (row) =>
      (["home", "away"] as const).flatMap((side) =>
        refs(row.presentPlayers?.[side]).map((playerId, ordinal) => ({
          identity: `${id(row._id)}:${playerId}:${side}`,
          ordinal,
        })),
      ),
    async (ids) =>
      (await prisma.gamePresentPlayer.findMany({ where: { gameId: { in: ids } } })).map((row) => ({
        identity: `${row.gameId}:${row.playerId}:${row.side}`,
        ordinal: row.ordinal,
      })),
  );
}

async function migrateAll(
  prisma: MigrationClient,
  snapshot: SourceSnapshot,
  batchSize: number,
  sanitization: Sanitization,
) {
  await migrateRows(snapshot, "users", batchSize, sanitization, async (row) => {
    await prisma.user.upsert({
      where: { id: id(row._id) },
      create: userData(row),
      update: userData(row, false),
    });
  });
  await migrateRows(snapshot, "tournaments", batchSize, sanitization, (row) =>
    prisma.tournament.upsert({
      where: { id: id(row._id) },
      create: tournamentData(row),
      update: tournamentData(row, false),
    }),
  );
  await migrateRows(snapshot, "divisions", batchSize, sanitization, (row) =>
    prisma.division.upsert({
      where: { id: id(row._id) },
      create: divisionData(row),
      update: divisionData(row, false),
    }),
  );
  await migrateRows(snapshot, "teams", batchSize, sanitization, (row) =>
    prisma.team.upsert({ where: { id: id(row._id) }, create: teamData(row), update: teamData(row, false) }),
  );
  await migrateRows(snapshot, "players", batchSize, sanitization, (row) =>
    prisma.player.upsert({ where: { id: id(row._id) }, create: playerData(row), update: playerData(row, false) }),
  );
  await migrateRows(snapshot, "judges", batchSize, sanitization, (row) =>
    prisma.judge.upsert({
      where: { id: id(row._id) },
      create: {
        id: id(row._id),
        firstName: String(row.firstName),
        lastName: String(row.lastName),
        normalizedName: normalizeName(row.firstName, row.lastName),
        ...(row.createdAt ? { createdAt: date(row.createdAt) } : {}),
        ...(row.updatedAt ? { updatedAt: date(row.updatedAt) } : {}),
      },
      update: {
        firstName: String(row.firstName),
        lastName: String(row.lastName),
        normalizedName: normalizeName(row.firstName, row.lastName),
        ...(row.updatedAt ? { updatedAt: date(row.updatedAt) } : {}),
      },
    }),
  );
  await migrateMemberships(prisma, snapshot, batchSize);

  await migrateRows(snapshot, "games", batchSize, sanitization, (row) =>
    prisma.game.upsert({ where: { id: id(row._id) }, create: gameData(row), update: gameData(row, false) }),
  );
  await migratePresentPlayers(prisma, snapshot, batchSize);
  await migrateRows(snapshot, "gameEvents", batchSize, sanitization, (row) =>
    prisma.gameEvent.upsert({
      where: { id: id(row._id) },
      create: eventData(row),
      update: eventData(row, false),
    }),
  );
  await migrateRows(snapshot, "standings", batchSize, sanitization, (row) =>
    prisma.standing.upsert({
      where: { id: id(row._id) },
      create: standingData(row),
      update: standingData(row, false),
    }),
  );
  await migrateRows(snapshot, "playerStatistics", batchSize, sanitization, (row) =>
    prisma.playerStatistics.upsert({
      where: { id: id(row._id) },
      create: playerStatsData(row),
      update: playerStatsData(row, false),
    }),
  );
  await migrateRows(snapshot, "teamStatistics", batchSize, sanitization, (row) =>
    prisma.teamStatistics.upsert({
      where: { id: id(row._id) },
      create: teamStatsData(row),
      update: teamStatsData(row, false),
    }),
  );
  await migrateRows(snapshot, "otpVerifications", batchSize, sanitization, (row) =>
    prisma.otpVerification.upsert({
      where: { id: id(row._id) },
      create: otpData(row),
      update: otpData(row, false),
    }),
  );
  await migrateRows(snapshot, "gameEventCorrections", batchSize, sanitization, (row) =>
    prisma.gameEventCorrection.upsert({
      where: { id: id(row._id) },
      create: correctionData(row),
      update: correctionData(row, false),
    }),
  );
  await migrateRows(snapshot, "playerImportMigrations", batchSize, sanitization, (row) =>
    prisma.playerImportMigration.upsert({
      where: { sourceKey: String(row.sourceKey) },
      create: importData(row),
      update: importData(row),
    }),
  );
  await migrateRows(snapshot, "siteSettings", batchSize, sanitization, (row) =>
    prisma.siteSettings.upsert({
      where: { key: String(row.key || "global") },
      create: settingsData(row),
      update: settingsData(row),
    }),
  );
  await migrateRows(snapshot, "flagInterests", batchSize, sanitization, (row) =>
    prisma.flagInterest.upsert({
      where: { id: id(row._id) },
      create: interestData(row),
      update: interestData(row, false),
    }),
  );
  await migrateRows(snapshot, "adminAuditLogs", batchSize, sanitization, (row) =>
    prisma.adminAuditLog.upsert({
      where: { id: id(row._id) },
      create: auditData(row),
      update: auditData(row, false),
    }),
  );
}

async function migrateRows(
  snapshot: SourceSnapshot,
  key: CollectionKey,
  batchSize: number,
  sanitization: Sanitization,
  migrate: (row: Document) => Promise<unknown>,
) {
  for await (const batch of snapshot.batches(key, batchSize)) {
    for (const row of batch) await migrate(sanitizeRow(key, row, sanitization));
  }
}

async function migrateMemberships(prisma: MigrationClient, snapshot: SourceSnapshot, batchSize: number) {
  for await (const batch of snapshot.batches("tournaments", batchSize)) {
    for (const tournament of batch) {
      const tournamentId = id(tournament._id);
      await prisma.tournamentDivision.deleteMany({ where: { tournamentId } });
      await prisma.tournamentTeam.deleteMany({ where: { tournamentId } });
      for (const [ordinal, divisionId] of refs(tournament.divisions).entries()) {
        await prisma.tournamentDivision.upsert({
          where: { tournamentId_divisionId: { tournamentId, divisionId } },
          create: { tournamentId, divisionId, ordinal },
          update: { ordinal },
        });
      }
      for (const [ordinal, teamId] of refs(tournament.participatingTeams).entries()) {
        await prisma.tournamentTeam.upsert({
          where: { tournamentId_teamId: { tournamentId, teamId } },
          create: { tournamentId, teamId, ordinal },
          update: { ordinal },
        });
      }
    }
  }
  for await (const batch of snapshot.batches("divisions", batchSize)) {
    for (const division of batch) {
      const divisionId = id(division._id);
      await prisma.divisionTeam.deleteMany({ where: { divisionId } });
      for (const [ordinal, teamId] of refs(division.teams).entries()) {
        await prisma.divisionTeam.upsert({
          where: { divisionId_teamId: { divisionId, teamId } },
          create: { divisionId, teamId, ordinal },
          update: { ordinal },
        });
      }
    }
  }
  for await (const batch of snapshot.batches("teams", batchSize)) {
    for (const team of batch) {
      const teamId = id(team._id);
      await prisma.teamPlayer.deleteMany({ where: { teamId } });
      for (const [ordinal, playerId] of refs(team.players).entries()) {
        await prisma.teamPlayer.upsert({
          where: { teamId_playerId: { teamId, playerId } },
          create: { teamId, playerId, ordinal },
          update: { ordinal },
        });
      }
    }
  }
}

async function migratePresentPlayers(prisma: MigrationClient, snapshot: SourceSnapshot, batchSize: number) {
  for await (const batch of snapshot.batches("games", batchSize)) {
    for (const game of batch) {
      const gameId = id(game._id);
      await prisma.gamePresentPlayer.deleteMany({ where: { gameId } });
      for (const side of ["home", "away"] as const) {
        for (const [ordinal, playerId] of refs(game.presentPlayers?.[side]).entries()) {
          await prisma.gamePresentPlayer.upsert({
            where: { gameId_playerId_side: { gameId, playerId, side } },
            create: { gameId, playerId, side, ordinal },
            update: { ordinal },
          });
        }
      }
    }
  }
}

function sanitizeRow(key: CollectionKey, row: Document, sanitization: Sanitization): Document {
  const rowId = id(row._id);
  if (key === "divisions" && sanitization.divisionTournament.has(rowId)) delete row.tournament;
  if (key === "teams" && sanitization.teamTournament.has(rowId)) delete row.tournament;
  if (key === "gameEvents" && sanitization.eventPlayer.has(rowId)) delete row.player;
  if (key === "gameEventCorrections") {
    if (sanitization.correctionEvent.has(rowId)) delete row.event;
    if (sanitization.correctionReviewer.has(rowId)) delete row.reviewedBy;
  }
  if (key === "playerImportMigrations" && sanitization.importPlayer.has(rowId)) delete row.playerId;
  return row;
}

function base(row: Document, includeId = true) {
  return {
    ...(includeId ? { id: id(row._id) } : {}),
    ...(row.createdAt ? { createdAt: date(row.createdAt) } : {}),
    ...(row.updatedAt ? { updatedAt: date(row.updatedAt) } : {}),
  };
}

function userData(row: Document, includeId = true): any {
  return {
    ...base(row, includeId),
    name: String(row.name || ""),
    email: String(row.email || "").trim().toLowerCase(),
    passwordHash: String(row.password || row.passwordHash || ""),
    role: String(row.role || "user"),
    isActive: row.isActive !== false,
    lastLogin: row.lastLogin ? date(row.lastLogin) : null,
  };
}

function tournamentData(row: Document, includeId = true): any {
  return {
    ...base(row, includeId),
    name: String(row.name || ""),
    description: row.description || null,
    season: String(row.season || ""),
    year: Number(row.year),
    startDate: date(row.startDate),
    endDate: date(row.endDate),
    registrationDeadline: row.registrationDeadline ? date(row.registrationDeadline) : null,
    status: String(row.status || "upcoming"),
    format: String(row.format || "league"),
    playoffCriteria: row.playoffCriteria || null,
    ...jsonField("rules", row.rules),
    ...jsonField("prizes", row.prizes),
  };
}

function divisionData(row: Document, includeId = true): any {
  return {
    ...base(row, includeId),
    name: String(row.name || ""),
    category: String(row.category || ""),
    ageGroup: row.ageGroup || null,
    tournamentId: row.tournament ? id(row.tournament) : null,
    maxTeams: row.maxTeams === undefined ? null : Number(row.maxTeams),
  };
}

function teamData(row: Document, includeId = true): any {
  return {
    ...base(row, includeId),
    name: String(row.name || ""),
    shortName: row.shortName || null,
    logo: row.logo || null,
    backgroundImage: row.backgroundImage || null,
    colors: json(row.colors || { primary: "#000000" }),
    divisionId: id(row.division),
    tournamentId: row.tournament ? id(row.tournament) : null,
    ...jsonField("coach", row.coach),
    ...jsonField("coaches", row.coaches),
    contact: json(row.contact || {}),
    registrationDate: date(row.registrationDate),
    status: String(row.status || "active"),
  };
}

function playerData(row: Document, includeId = true): any {
  return {
    ...base(row, includeId),
    firstName: String(row.firstName || ""),
    lastName: String(row.lastName || ""),
    profilePicture: row.profilePicture || null,
    email: row.email ? String(row.email).trim().toLowerCase() : null,
    phone: row.phone || null,
    dateOfBirth: date(row.dateOfBirth, new Date("1900-01-01T00:00:00.000Z")),
    teamId: id(row.team),
    jerseyNumber: row.jerseyNumber === undefined || row.jerseyNumber === null ? null : Number(row.jerseyNumber),
    position: String(row.position || ""),
    secondaryPosition: row.secondaryPosition || null,
    height: row.height === undefined ? null : Number(row.height),
    weight: row.weight === undefined ? null : Number(row.weight),
    experience: row.experience || null,
    ...jsonField("emergencyContact", row.emergencyContact),
    registrationDate: date(row.registrationDate),
    status: String(row.status || "active"),
  };
}

function gameData(row: Document, includeId = true): any {
  return {
    ...base(row, includeId),
    tournamentId: id(row.tournament),
    divisionId: id(row.division),
    homeTeamId: row.homeTeam ? id(row.homeTeam) : null,
    awayTeamId: row.awayTeam ? id(row.awayTeam) : null,
    venue: json(row.venue || {}),
    scheduledDate: date(row.scheduledDate),
    actualStartTime: row.actualStartTime ? date(row.actualStartTime) : null,
    actualEndTime: row.actualEndTime ? date(row.actualEndTime) : null,
    status: String(row.status || "scheduled"),
    phase: String(row.phase || "regular"),
    playoffSlot: row.playoffSlot || null,
    week: row.week === undefined ? null : Number(row.week),
    round: row.round || null,
    officials: json(row.officials || []),
    score: json(row.score || { home: {}, away: {} }),
    statistics: json(row.statistics || { home: {}, away: {} }),
    notes: row.notes || null,
  };
}

function eventData(row: Document, includeId = true): any {
  return {
    ...(includeId ? { id: id(row._id) } : {}),
    ...(row.createdAt ? { createdAt: date(row.createdAt) } : {}),
    gameId: id(row.game),
    teamId: id(row.team),
    playerId: row.player ? id(row.player) : null,
    quarter: Number(row.quarter),
    sequence: Number(row.sequence || 0),
    time: row.time || null,
    type: String(row.type || ""),
    description: row.description || null,
    yards: row.yards === undefined ? null : Number(row.yards),
    points: row.points === undefined ? null : Number(row.points),
    ...jsonField("details", row.details),
  };
}

function standingData(row: Document, includeId = true): any {
  return {
    ...base(row, includeId),
    divisionId: id(row.division),
    tournamentId: id(row.tournament),
    teamId: id(row.team),
    position: Number(row.position || 0),
    wins: Number(row.wins || 0),
    losses: Number(row.losses || 0),
    ties: Number(row.ties || 0),
    pointsFor: Number(row.pointsFor || 0),
    pointsAgainst: Number(row.pointsAgainst || 0),
    pointsDifferential: Number(row.pointsDifferential ?? Number(row.pointsFor || 0) - Number(row.pointsAgainst || 0)),
    percentage: Number(row.percentage || 0),
    streak: row.streak || null,
    lastFiveGames: row.lastFiveGames || null,
  };
}

function playerStatsData(row: Document, includeId = true): any {
  return {
    ...(includeId ? { id: id(row._id) } : {}),
    playerId: id(row.player),
    tournamentId: id(row.tournament),
    divisionId: id(row.division),
    passing: json(row.passing || {}),
    rushing: json(row.rushing || {}),
    receiving: json(row.receiving || {}),
    defensive: json(row.defensive || {}),
    gamesPlayed: Number(row.gamesPlayed || 0),
  };
}

function teamStatsData(row: Document, includeId = true): any {
  return {
    ...(includeId ? { id: id(row._id) } : {}),
    teamId: id(row.team),
    tournamentId: id(row.tournament),
    divisionId: id(row.division),
    wins: Number(row.wins || 0),
    losses: Number(row.losses || 0),
    ties: Number(row.ties || 0),
    pointsFor: Number(row.pointsFor || 0),
    pointsAgainst: Number(row.pointsAgainst || 0),
    pointsDifferential: Number(row.pointsDifferential || 0),
    offensiveStats: json(row.offensiveStats || {}),
    defensiveStats: json(row.defensiveStats || {}),
    turnovers: Number(row.turnovers || 0),
    turnoverDifferential: Number(row.turnoverDifferential || 0),
    penalties: Number(row.penalties || 0),
    penaltyYards: Number(row.penaltyYards || 0),
  };
}

function otpData(row: Document, includeId = true): any {
  return {
    ...(includeId ? { id: id(row._id) } : {}),
    ...(row.createdAt ? { createdAt: date(row.createdAt) } : {}),
    userId: id(row.userId),
    email: String(row.email || "").toLowerCase(),
    purpose: String(row.purpose),
    tokenHash: String(row.tokenHash),
    codeHash: String(row.codeHash),
    expiresAt: date(row.expiresAt),
    consumedAt: row.consumedAt ? date(row.consumedAt) : null,
    attempts: Number(row.attempts || 0),
    maxAttempts: Number(row.maxAttempts || 5),
  };
}

function correctionData(row: Document, includeId = true): any {
  return {
    ...(includeId ? { id: id(row._id) } : {}),
    ...(row.createdAt ? { createdAt: date(row.createdAt) } : {}),
    gameId: id(row.game),
    eventId: row.event ? id(row.event) : null,
    operation: String(row.operation),
    status: String(row.status || "pending"),
    ...jsonField("proposedEvent", row.proposedEvent),
    ...jsonField("originalEvent", row.originalEvent),
    requestedById: id(row.requestedBy),
    requestedByName: row.requestedByName || null,
    requestedByEmail: row.requestedByEmail || null,
    reviewedById: row.reviewedBy ? id(row.reviewedBy) : null,
    reviewedAt: row.reviewedAt ? date(row.reviewedAt) : null,
    reviewNote: row.reviewNote || null,
  };
}

function importData(row: Document): any {
  return {
    sourceKey: String(row.sourceKey),
    email: String(row.email || "").toLowerCase(),
    marcaTemporal: String(row.marcaTemporal || ""),
    firstName: String(row.firstName || ""),
    lastName: String(row.lastName || ""),
    playerId: row.playerId ? id(row.playerId) : null,
  };
}

function settingsData(row: Document): any {
  return {
    key: String(row.key || "global"),
    ...(row.updatedAt ? { updatedAt: date(row.updatedAt) } : {}),
    whatsappMessageTemplate: String(row.whatsappMessageTemplate || ""),
    contactEmail: String(row.contactEmail || ""),
    contactWhatsapp: String(row.contactWhatsapp || ""),
    instagramUrl: String(row.instagramUrl || ""),
    whatsappChannelUrl: String(row.whatsappChannelUrl || ""),
    sponsors: json(row.sponsors || []),
    homepageAnnouncement: json(row.homepageAnnouncement || {}),
    featureVisibility: json(row.featureVisibility || {}),
  };
}

function interestData(row: Document, includeId = true): any {
  return {
    ...(includeId ? { id: id(row._id) } : {}),
    ...(row.createdAt ? { createdAt: date(row.createdAt) } : {}),
    interestType: String(row.interestType),
    interestLabel: String(row.interestLabel),
    name: String(row.name),
    ageRange: String(row.ageRange),
    location: String(row.location),
    whatsapp: String(row.whatsapp),
    whatsappDigits: String(row.whatsappDigits),
    experience: row.experience || "",
    company: row.company || "",
    sponsorInterest: row.sponsorInterest || "",
  };
}

function auditData(row: Document, includeId = true): any {
  return {
    ...(includeId ? { id: id(row._id) } : {}),
    ...(row.createdAt ? { createdAt: date(row.createdAt) } : {}),
    actorId: id(row.actorId),
    actorName: String(row.actorName),
    actorEmail: String(row.actorEmail).toLowerCase(),
    action: String(row.action),
    entityType: String(row.entityType),
    entityId: row.entityId || null,
    entityLabel: row.entityLabel || null,
    summary: String(row.summary),
    ...jsonField("before", row.before),
    ...jsonField("after", row.after),
    ...jsonField("metadata", row.metadata),
  };
}

async function targetCounts(prisma: PrismaClient): Promise<Record<string, number>> {
  const pairs: Array<[string, Promise<number>]> = [
    [COLLECTIONS.users, prisma.user.count()],
    [COLLECTIONS.tournaments, prisma.tournament.count()],
    [COLLECTIONS.divisions, prisma.division.count()],
    [COLLECTIONS.teams, prisma.team.count()],
    [COLLECTIONS.players, prisma.player.count()],
    [COLLECTIONS.judges, prisma.judge.count()],
    [COLLECTIONS.games, prisma.game.count()],
    [COLLECTIONS.gameEvents, prisma.gameEvent.count()],
    [COLLECTIONS.standings, prisma.standing.count()],
    [COLLECTIONS.playerStatistics, prisma.playerStatistics.count()],
    [COLLECTIONS.teamStatistics, prisma.teamStatistics.count()],
    [COLLECTIONS.otpVerifications, prisma.otpVerification.count()],
    [COLLECTIONS.gameEventCorrections, prisma.gameEventCorrection.count()],
    [COLLECTIONS.playerImportMigrations, prisma.playerImportMigration.count()],
    [COLLECTIONS.siteSettings, prisma.siteSettings.count()],
    [COLLECTIONS.flagInterests, prisma.flagInterest.count()],
    [COLLECTIONS.adminAuditLogs, prisma.adminAuditLog.count()],
  ];
  const values = await Promise.all(pairs.map(([, promise]) => promise));
  return Object.fromEntries(pairs.map(([name], index) => [name, values[index]]));
}

function printSummary(report: MigrationReport) {
  console.log(
    JSON.stringify(
      {
        mode: report.mode,
        sourceDatabase: report.sourceDatabase,
        sourceCounts: report.sourceCounts,
        targetCounts: report.targetCounts,
        issues: report.issues,
        warnings: report.warnings,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
