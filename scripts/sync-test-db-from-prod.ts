import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

/**
 * Copia los datos de la base PostgreSQL de prod a la de testing, preservando las cuentas de testing.
 *
 * - Prod se lee en una transacción READ ONLY con snapshot consistente.
 * - Testing se reemplaza en una sola transacción: si algo falla no queda nada a medias.
 * - Las tablas de cuentas (PRESERVED_TABLES) no se tocan. Las referencias de prod a usuarios se
 *   remapean por email a los usuarios de testing; si no hay match, la FK nullable queda en null y la
 *   fila con FK obligatoria se descarta (junto con lo que dependa de ella).
 * - El esquema de testing puede estar adelantado a prod (migraciones todavía no liberadas): se copian
 *   las columnas en común y las tablas que prod no tiene se rellenan con BACKFILLS.
 */

const LOG = "[db:sync-test-from-prod]";
const MIGRATIONS_TABLE = "_prisma_migrations";

/** Cuentas y credenciales de login: testing conserva las suyas. */
const PRESERVED_TABLES = new Set(["users", "otp_verifications", "fantasy_users", "fantasy_password_resets"]);

/** Tablas de cuentas cuyas filas de prod se remapean por email a las de testing. */
const IDENTITY_TABLES = ["users", "fantasy_users"];

/** Relleno para tablas que existen en testing pero todavía no en prod (mismo SQL que su migración). */
const BACKFILLS: Record<string, string> = {
  player_modality_profiles: `
    INSERT INTO "player_modality_profiles" ("player_id", "modality", "jersey_number", "position", "secondary_position", "updated_at")
    SELECT p."id", COALESCE(d."modality", 'flag'), p."jersey_number", p."position", p."secondary_position", CURRENT_TIMESTAMP
    FROM "players" p
    LEFT JOIN "teams" t ON t."id" = p."team_id"
    LEFT JOIN "divisions" d ON d."id" = t."division_id"`,
};

const MAX_PARAMS = 60_000;
const MAX_BATCH_ROWS = 500;

type Row = Record<string, string | null>;

interface Column {
  name: string;
  nullable: boolean;
  hasDefault: boolean;
  identity: boolean;
}

interface ForeignKey {
  name: string;
  table: string;
  columns: string[];
  refTable: string;
  refColumns: string[];
}

interface Schema {
  tables: Map<string, Map<string, Column>>;
  foreignKeys: ForeignKey[];
  migrations: Set<string>;
}

interface TablePlan {
  table: string;
  action: "preserve" | "replace" | "backfill" | "empty";
  columns: string[];
  sourceCount: number;
  targetCount: number;
  copied: number;
  skipped: number;
  nulled: number;
  remapped: number;
}

// Every value travels as Postgres' own text representation, which is valid input for the same type:
// no JS round trip for timestamps, numerics, bigints or JSON.
const RAW_TYPES = { getTypeParser: () => (value: string) => value } as unknown as pg.CustomTypesConfig;

function parseArgs() {
  const args = new Set(process.argv.slice(2));
  return { confirm: args.has("--confirm"), help: args.has("--help") || args.has("-h") };
}

function printHelp() {
  console.log(`
Copia la base PostgreSQL de prod a la de testing, preservando las cuentas de testing.

Variables (en .env):
  SYNC_SOURCE_DATABASE_URL  conexión directa a prod (solo se lee)
  SYNC_TARGET_DATABASE_URL  conexión directa a testing (se reemplaza)

Uso:
  npm run db:sync-test-from-prod
  npm run db:sync-test-from-prod -- --confirm

Sin --confirm corre en modo dry-run: calcula el plan completo sin escribir nada.
`);
}

function requireUrl(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} es requerida. Cargala en .env antes de correr el script.`);
  return value;
}

/** host:port/database, sin credenciales, para mostrar y comparar. */
function describeUrl(url: string) {
  const parsed = new URL(url);
  return `${parsed.hostname}:${parsed.port || "5432"}${parsed.pathname}`;
}

function quote(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function keyOf(row: Row, columns: string[]) {
  return JSON.stringify(columns.map((column) => row[column]));
}

async function readSchema(client: pg.Client): Promise<Schema> {
  const columns = await client.query<{
    table_name: string;
    column_name: string;
    is_nullable: string;
    column_default: string | null;
    is_identity: string;
    is_generated: string;
  }>(`
    SELECT c.table_name, c.column_name, c.is_nullable, c.column_default, c.is_identity, c.is_generated
    FROM information_schema.columns c
    JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE' AND c.table_name <> '${MIGRATIONS_TABLE}'
    ORDER BY c.table_name, c.ordinal_position`);

  const tables = new Map<string, Map<string, Column>>();
  for (const row of columns.rows) {
    if (row.is_generated === "ALWAYS") continue;
    if (!tables.has(row.table_name)) tables.set(row.table_name, new Map());
    tables.get(row.table_name)!.set(row.column_name, {
      name: row.column_name,
      nullable: row.is_nullable === "YES",
      hasDefault: row.column_default !== null,
      identity: row.is_identity === "YES",
    });
  }

  const constraints = await client.query<{ name: string; table: string; columns: string; ref_table: string; ref_columns: string }>(`
    SELECT con.conname AS name, rel.relname AS table, ref.relname AS ref_table,
      (SELECT json_agg(a.attname ORDER BY k.ord) FROM unnest(con.conkey) WITH ORDINALITY k(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k.attnum) AS columns,
      (SELECT json_agg(a.attname ORDER BY k.ord) FROM unnest(con.confkey) WITH ORDINALITY k(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = con.confrelid AND a.attnum = k.attnum) AS ref_columns
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_class ref ON ref.oid = con.confrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE con.contype = 'f' AND ns.nspname = 'public'`);

  const migrationsTable = await client.query(`SELECT to_regclass('public.${MIGRATIONS_TABLE}') AS name`);
  const migrations = migrationsTable.rows[0]?.name
    ? await client.query<{ migration_name: string }>(
        `SELECT migration_name FROM ${quote(MIGRATIONS_TABLE)} WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`,
      )
    : { rows: [] };

  return {
    tables,
    foreignKeys: constraints.rows.map((row) => ({
      name: row.name,
      table: row.table,
      columns: JSON.parse(row.columns),
      refTable: row.ref_table,
      refColumns: JSON.parse(row.ref_columns),
    })),
    migrations: new Set(migrations.rows.map((row) => row.migration_name)),
  };
}

/** Parents before children, so every FK can be checked against rows already accepted. */
function sortByDependencies(tables: string[], foreignKeys: ForeignKey[]) {
  const pending = new Set(tables);
  const ordered: string[] = [];
  while (pending.size) {
    const ready = [...pending].filter((table) =>
      foreignKeys.every((fk) => fk.table !== table || fk.refTable === table || !pending.has(fk.refTable)),
    );
    if (!ready.length) throw new Error(`Dependencias circulares entre tablas: ${[...pending].join(", ")}`);
    for (const table of ready.sort()) {
      ordered.push(table);
      pending.delete(table);
    }
  }
  return ordered;
}

function assertCompatible(source: Schema, target: Schema) {
  const missingInTarget = [...source.migrations].filter((name) => !target.migrations.has(name));
  if (missingInTarget.length) {
    throw new Error(
      `Testing no tiene migraciones que prod ya aplicó (${missingInTarget.join(", ")}). ` +
        "Corré prisma migrate deploy contra testing y volvé a intentar.",
    );
  }

  for (const table of PRESERVED_TABLES) {
    const dependsOnReplaced = target.foreignKeys.find((fk) => fk.table === table && !PRESERVED_TABLES.has(fk.refTable));
    if (dependsOnReplaced) {
      throw new Error(`La tabla preservada ${table} referencia a ${dependsOnReplaced.refTable}, que se reemplaza.`);
    }
  }

  for (const [table, targetColumns] of target.tables) {
    const sourceColumns = source.tables.get(table);
    if (!sourceColumns || PRESERVED_TABLES.has(table)) continue;
    for (const column of targetColumns.values()) {
      if (!sourceColumns.has(column.name) && !column.nullable && !column.hasDefault && !column.identity) {
        throw new Error(
          `${table}.${column.name} es obligatoria en testing y no existe en prod. Agregá un relleno para esa columna.`,
        );
      }
    }
  }
}

async function countRows(client: pg.Client, table: string) {
  const result = await client.query<{ count: string }>(`SELECT count(*) AS count FROM ${quote(table)}`);
  return Number(result.rows[0].count);
}

/** prod user id -> testing user id, matching by email (case-insensitive). */
async function buildIdentityMaps(source: pg.Client, target: pg.Client, sourceSchema: Schema) {
  const maps = new Map<string, Map<string, string>>();
  for (const table of IDENTITY_TABLES) {
    const map = new Map<string, string>();
    maps.set(table, map);
    if (!sourceSchema.tables.has(table)) continue;
    const query = `SELECT id, lower(email) AS email FROM ${quote(table)}`;
    const [sourceRows, targetRows] = await Promise.all([source.query<Row>(query), target.query<Row>(query)]);
    const targetByEmail = new Map(targetRows.rows.map((row) => [row.email, row.id!]));
    for (const row of sourceRows.rows) {
      const targetId = targetByEmail.get(row.email);
      if (targetId) map.set(row.id!, targetId);
    }
  }
  return maps;
}

/** Keys present in testing for every (table, columns) that some FK points to. */
class ReferenceIndex {
  private readonly keys = new Map<string, Set<string>>();

  constructor(private readonly foreignKeys: ForeignKey[]) {}

  private id(table: string, columns: string[]) {
    return `${table}(${columns.join(",")})`;
  }

  private referencedColumns(table: string) {
    const seen = new Map<string, string[]>();
    for (const fk of this.foreignKeys) {
      if (fk.refTable === table) seen.set(this.id(table, fk.refColumns), fk.refColumns);
    }
    return [...seen.values()];
  }

  async loadFromTarget(target: pg.Client, table: string) {
    for (const columns of this.referencedColumns(table)) {
      const result = await target.query<Row>(`SELECT ${columns.map(quote).join(", ")} FROM ${quote(table)}`);
      this.keys.set(this.id(table, columns), new Set(result.rows.map((row) => keyOf(row, columns))));
    }
  }

  add(table: string, rows: Row[]) {
    for (const columns of this.referencedColumns(table)) {
      const id = this.id(table, columns);
      const set = this.keys.get(id) ?? new Set<string>();
      for (const row of rows) set.add(keyOf(row, columns));
      this.keys.set(id, set);
    }
  }

  has(table: string, columns: string[], row: Row, valueColumns: string[]) {
    const key = JSON.stringify(valueColumns.map((column) => row[column]));
    return this.keys.get(this.id(table, columns))?.has(key) ?? false;
  }
}

/** Remaps account references and drops or nulls the FKs that would not resolve in testing. */
function filterRows(
  rows: Row[],
  plan: TablePlan,
  foreignKeys: ForeignKey[],
  columns: Map<string, Column>,
  identityMaps: Map<string, Map<string, string>>,
  references: ReferenceIndex,
) {
  const accepted: Row[] = [];
  const tableKeys = foreignKeys.filter((fk) => fk.table === plan.table);

  for (const original of rows) {
    const row = { ...original };
    let keep = true;

    for (const fk of tableKeys) {
      if (fk.columns.some((column) => row[column] === null || row[column] === undefined)) continue;

      const identityMap = identityMaps.get(fk.refTable);
      if (identityMap && fk.columns.length === 1 && fk.refColumns[0] === "id") {
        const mapped = identityMap.get(row[fk.columns[0]]!);
        if (mapped) {
          if (mapped !== row[fk.columns[0]]) plan.remapped += 1;
          row[fk.columns[0]] = mapped;
        }
      }

      // Self references resolve inside the same batch; everything else must already exist in testing.
      if (fk.refTable === plan.table || references.has(fk.refTable, fk.refColumns, row, fk.columns)) continue;

      if (fk.columns.every((column) => columns.get(column)?.nullable)) {
        for (const column of fk.columns) row[column] = null;
        plan.nulled += 1;
      } else {
        keep = false;
        break;
      }
    }

    if (keep) accepted.push(row);
    else plan.skipped += 1;
  }

  return accepted;
}

async function insertRows(target: pg.Client, table: string, columns: string[], identity: boolean, rows: Row[]) {
  if (!rows.length || !columns.length) return;
  const batchSize = Math.max(1, Math.min(MAX_BATCH_ROWS, Math.floor(MAX_PARAMS / columns.length)));
  const columnList = columns.map(quote).join(", ");
  const overriding = identity ? " OVERRIDING SYSTEM VALUE" : "";

  for (let start = 0; start < rows.length; start += batchSize) {
    const batch = rows.slice(start, start + batchSize);
    const values: (string | null)[] = [];
    const tuples = batch.map((row) => {
      const placeholders = columns.map((column) => {
        values.push(row[column] ?? null);
        return `$${values.length}`;
      });
      return `(${placeholders.join(", ")})`;
    });
    await target.query(`INSERT INTO ${quote(table)} (${columnList})${overriding} VALUES ${tuples.join(", ")}`, values);
  }
}

async function resetSequences(target: pg.Client, table: string) {
  const sequences = await target.query<{ column_name: string; sequence: string }>(
    `SELECT column_name, pg_get_serial_sequence($1, column_name) AS sequence
     FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $2`,
    [quote(table), table],
  );
  for (const { column_name: column, sequence } of sequences.rows) {
    if (!sequence) continue;
    await target.query(
      `SELECT setval($1, COALESCE((SELECT max(${quote(column)}) FROM ${quote(table)}), 0) + 1, false)`,
      [sequence],
    );
  }
}

async function backupTarget(target: pg.Client, plans: TablePlan[], meta: Record<string, unknown>) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(process.cwd(), ".tmp", "db-sync-backups", timestamp);
  await mkdir(backupDir, { recursive: true });
  await writeFile(path.join(backupDir, "summary.json"), JSON.stringify({ ...meta, plans }, null, 2), "utf8");

  for (const plan of plans) {
    if (plan.action === "preserve" || plan.targetCount === 0) continue;
    const result = await target.query<Row>(`SELECT * FROM ${quote(plan.table)}`);
    const lines = result.rows.map((row) => JSON.stringify(row)).join("\n");
    await writeFile(path.join(backupDir, `${plan.table}.ndjson`), lines ? `${lines}\n` : "", "utf8");
  }
  return backupDir;
}

function printPlan(plans: TablePlan[], warnings: string[], confirm: boolean) {
  console.log("");
  for (const plan of plans) {
    const counts = `testing=${plan.targetCount}`;
    if (plan.action === "preserve") {
      console.log(`- PRESERVAR ${plan.table}: ${counts}`);
    } else if (plan.action === "backfill") {
      console.log(`- RELLENAR ${plan.table}: ${counts} -> se genera desde los datos copiados (no existe en prod)`);
    } else if (plan.action === "empty") {
      console.log(`- VACIAR ${plan.table}: ${counts} -> 0 (no existe en prod)`);
    } else {
      const details = [
        plan.skipped ? `${plan.skipped} descartadas` : "",
        plan.nulled ? `${plan.nulled} referencias en null` : "",
        plan.remapped ? `${plan.remapped} remapeadas por email` : "",
      ].filter(Boolean);
      const suffix = details.length ? ` (${details.join(", ")})` : "";
      console.log(`- REEMPLAZAR ${plan.table}: ${counts} -> ${plan.copied} de prod=${plan.sourceCount}${suffix}`);
    }
  }

  if (warnings.length) {
    console.log("");
    for (const warning of warnings) console.log(`! ${warning}`);
  }

  if (!confirm) {
    console.log("");
    console.log(`${LOG} No se aplicaron cambios. Agregá --confirm para ejecutar.`);
  }
}

async function main() {
  const args = parseArgs();
  if (args.help) {
    printHelp();
    return;
  }

  const sourceUrl = requireUrl("SYNC_SOURCE_DATABASE_URL");
  const targetUrl = requireUrl("SYNC_TARGET_DATABASE_URL");
  if (describeUrl(sourceUrl) === describeUrl(targetUrl)) {
    throw new Error("SYNC_SOURCE_DATABASE_URL y SYNC_TARGET_DATABASE_URL apuntan a la misma base.");
  }

  const source = new pg.Client({ connectionString: sourceUrl, types: RAW_TYPES });
  const target = new pg.Client({ connectionString: targetUrl, types: RAW_TYPES });
  await Promise.all([source.connect(), target.connect()]);

  let targetInTransaction = false;
  try {
    // One consistent, read-only snapshot of prod for the whole run.
    await source.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");

    console.log(`${LOG} Modo: ${args.confirm ? "CONFIRMADO" : "DRY-RUN"}`);
    console.log(`${LOG} Origen: ${describeUrl(sourceUrl)} (solo lectura)`);
    console.log(`${LOG} Destino: ${describeUrl(targetUrl)}`);

    const [sourceSchema, targetSchema] = await Promise.all([readSchema(source), readSchema(target)]);
    assertCompatible(sourceSchema, targetSchema);

    const warnings: string[] = [];
    const pendingMigrations = [...targetSchema.migrations].filter((name) => !sourceSchema.migrations.has(name)).sort();
    if (pendingMigrations.length) {
      warnings.push(`Testing tiene migraciones que prod todavía no: ${pendingMigrations.join(", ")}.`);
    }
    for (const table of sourceSchema.tables.keys()) {
      if (!targetSchema.tables.has(table)) warnings.push(`La tabla ${table} existe en prod pero no en testing: no se copia.`);
    }

    const tables = sortByDependencies([...targetSchema.tables.keys()], targetSchema.foreignKeys);
    const identityMaps = await buildIdentityMaps(source, target, sourceSchema);
    const references = new ReferenceIndex(targetSchema.foreignKeys);
    const pendingRows = new Map<string, Row[]>();
    const plans: TablePlan[] = [];

    for (const table of tables) {
      const targetColumns = targetSchema.tables.get(table)!;
      const sourceColumns = sourceSchema.tables.get(table);
      const plan: TablePlan = {
        table,
        action: PRESERVED_TABLES.has(table) ? "preserve" : sourceColumns ? "replace" : BACKFILLS[table] ? "backfill" : "empty",
        columns: [],
        sourceCount: 0,
        targetCount: await countRows(target, table),
        copied: 0,
        skipped: 0,
        nulled: 0,
        remapped: 0,
      };
      plans.push(plan);

      if (plan.action === "preserve") {
        await references.loadFromTarget(target, table);
        continue;
      }
      if (!sourceColumns) {
        if (plan.action === "empty") warnings.push(`La tabla ${table} no existe en prod y no tiene relleno: queda vacía.`);
        continue;
      }

      plan.columns = [...targetColumns.keys()].filter((column) => sourceColumns.has(column));
      const dropped = [...sourceColumns.keys()].filter((column) => !targetColumns.has(column));
      if (dropped.length) warnings.push(`${table}: columnas de prod que testing ya no tiene, no se copian: ${dropped.join(", ")}.`);

      const result = await source.query<Row>(`SELECT ${plan.columns.map(quote).join(", ")} FROM ${quote(table)}`);
      plan.sourceCount = result.rows.length;
      const rows = filterRows(result.rows, plan, targetSchema.foreignKeys, targetColumns, identityMaps, references);
      plan.copied = rows.length;
      references.add(table, rows);
      pendingRows.set(table, rows);
    }

    await source.query("COMMIT");

    const identityMatches = IDENTITY_TABLES.map((table) => {
      const plan = plans.find((item) => item.table === table);
      return plan ? `${table}: ${identityMaps.get(table)?.size ?? 0} cuentas de prod con email en testing` : "";
    }).filter(Boolean);
    warnings.push(...identityMatches);

    printPlan(plans, warnings, args.confirm);
    if (!args.confirm) return;

    const backupDir = await backupTarget(target, plans, {
      createdAt: new Date().toISOString(),
      source: describeUrl(sourceUrl),
      target: describeUrl(targetUrl),
      preservedTables: [...PRESERVED_TABLES],
    });
    console.log("");
    console.log(`${LOG} Backup local de testing en ${backupDir}`);

    await target.query("BEGIN");
    targetInTransaction = true;
    await target.query("SET LOCAL statement_timeout = 0");

    const cleared = plans.filter((plan) => plan.action !== "preserve").map((plan) => quote(plan.table));
    if (cleared.length) await target.query(`TRUNCATE ${cleared.join(", ")}`);

    for (const plan of plans) {
      if (plan.action === "replace") {
        const columns = targetSchema.tables.get(plan.table)!;
        const identity = plan.columns.some((column) => columns.get(column)?.identity);
        console.log(`${LOG} Copiando ${plan.table} (${plan.copied})`);
        await insertRows(target, plan.table, plan.columns, identity, pendingRows.get(plan.table) ?? []);
        await resetSequences(target, plan.table);
      } else if (plan.action === "backfill") {
        console.log(`${LOG} Rellenando ${plan.table}`);
        const result = await target.query(BACKFILLS[plan.table]);
        plan.copied = result.rowCount ?? 0;
      }
    }

    const mismatches: string[] = [];
    for (const plan of plans) {
      if (plan.action !== "replace") continue;
      const count = await countRows(target, plan.table);
      if (count !== plan.copied) mismatches.push(`${plan.table}: esperado=${plan.copied}, testing=${count}`);
    }
    if (mismatches.length) throw new Error(`Los conteos no coinciden después de copiar: ${mismatches.join("; ")}`);

    await target.query("COMMIT");
    targetInTransaction = false;
    console.log(`${LOG} Sync completado correctamente.`);
  } catch (error) {
    if (targetInTransaction) {
      await target.query("ROLLBACK").catch(() => undefined);
      console.error(`${LOG} Se revirtió la transacción: testing quedó como estaba.`);
    }
    throw error;
  } finally {
    await Promise.allSettled([source.end(), target.end()]);
  }
}

main().catch((error: unknown) => {
  console.error(`${LOG} Error:`, error instanceof Error ? error.message : error);
  process.exit(1);
});
