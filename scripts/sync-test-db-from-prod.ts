import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";

const SOURCE_DB_NAME: string = "prod";
const TARGET_DB_NAME: string = "test";
const PRESERVED_COLLECTIONS = new Set(["users"]);
const DEFAULT_BATCH_SIZE = 500;

interface CollectionPlan {
  name: string;
  sourceCount: number;
  targetCount: number;
  action: "replace" | "drop-target-only" | "preserve";
}

interface Args {
  confirm: boolean;
  help: boolean;
}

function parseArgs(): Args {
  const args = new Set(process.argv.slice(2));
  return {
    confirm: args.has("--confirm"),
    help: args.has("--help") || args.has("-h"),
  };
}

function printHelp() {
  console.log(`
Sync MongoDB test database from prod while preserving users.

Usage:
  npm run db:sync-test-from-prod
  npm run db:sync-test-from-prod -- --confirm

Without --confirm this script runs in dry-run mode.
`);
}

function getMongoUri() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required. Load it from .env before running this script.");
  }
  return uri;
}

async function listCollectionNames(db: mongoose.mongo.Db) {
  const collections = await db.listCollections({}, { nameOnly: false }).toArray();
  const nonCollections = collections.filter((collection) => collection.type && collection.type !== "collection");

  if (nonCollections.length > 0) {
    const names = nonCollections.map((collection) => `${collection.name} (${collection.type})`).join(", ");
    throw new Error(`Unsupported non-collection MongoDB objects found in ${db.databaseName}: ${names}`);
  }

  return collections.map((collection) => collection.name).sort();
}

async function countDocuments(db: mongoose.mongo.Db, collectionName: string) {
  return db.collection(collectionName).estimatedDocumentCount();
}

async function buildPlan(sourceDb: mongoose.mongo.Db, targetDb: mongoose.mongo.Db): Promise<CollectionPlan[]> {
  const [sourceCollections, targetCollections] = await Promise.all([
    listCollectionNames(sourceDb),
    listCollectionNames(targetDb),
  ]);

  const allCollections = Array.from(new Set([...sourceCollections, ...targetCollections])).sort();

  return Promise.all(
    allCollections.map(async (name) => {
      const existsInSource = sourceCollections.includes(name);
      const existsInTarget = targetCollections.includes(name);
      const [sourceCount, targetCount] = await Promise.all([
        existsInSource ? countDocuments(sourceDb, name) : Promise.resolve(0),
        existsInTarget ? countDocuments(targetDb, name) : Promise.resolve(0),
      ]);

      if (PRESERVED_COLLECTIONS.has(name)) {
        return { name, sourceCount, targetCount, action: "preserve" };
      }

      if (existsInSource) {
        return { name, sourceCount, targetCount, action: "replace" };
      }

      return { name, sourceCount, targetCount, action: "drop-target-only" };
    }),
  );
}

function printPlan(plan: CollectionPlan[], confirm: boolean) {
  const mode = confirm ? "CONFIRMADO" : "DRY-RUN";
  console.log(`[db:sync-test-from-prod] Modo: ${mode}`);
  console.log(`[db:sync-test-from-prod] Origen: ${SOURCE_DB_NAME} (solo lectura)`);
  console.log(`[db:sync-test-from-prod] Destino: ${TARGET_DB_NAME}`);
  console.log("");

  for (const item of plan) {
    if (item.action === "preserve") {
      console.log(`- PRESERVAR ${item.name}: test=${item.targetCount}, prod=${item.sourceCount}`);
      continue;
    }

    if (item.action === "replace") {
      console.log(`- REEMPLAZAR ${item.name}: test=${item.targetCount} -> prod=${item.sourceCount}`);
      continue;
    }

    console.log(`- ELIMINAR SOLO EN TEST ${item.name}: test=${item.targetCount}, prod=no existe`);
  }

  if (!confirm) {
    console.log("");
    console.log("[db:sync-test-from-prod] No se aplicaron cambios. Agrega --confirm para ejecutar.");
  }
}

async function backupCollection(db: mongoose.mongo.Db, collectionName: string, backupDir: string) {
  const collection = db.collection(collectionName);
  const filePath = path.join(backupDir, `${collectionName}.json`);
  const writeStream: string[] = [];

  for await (const doc of collection.find({})) {
    writeStream.push(JSON.stringify(doc));
  }

  await writeFile(filePath, `${writeStream.join("\n")}${writeStream.length > 0 ? "\n" : ""}`, "utf8");
}

async function createBackup(targetDb: mongoose.mongo.Db, plan: CollectionPlan[]) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(process.cwd(), ".tmp", "db-sync-backups", timestamp);
  const changedCollections = plan.filter((item) => item.action !== "preserve" && item.targetCount > 0);

  await mkdir(backupDir, { recursive: true });
  await writeFile(
    path.join(backupDir, "summary.json"),
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        sourceDb: SOURCE_DB_NAME,
        targetDb: TARGET_DB_NAME,
        preservedCollections: Array.from(PRESERVED_COLLECTIONS),
        plan,
      },
      null,
      2,
    ),
    "utf8",
  );

  for (const item of changedCollections) {
    await backupCollection(targetDb, item.name, backupDir);
  }

  return backupDir;
}

async function recreateIndexes(
  sourceDb: mongoose.mongo.Db,
  targetDb: mongoose.mongo.Db,
  collectionName: string,
) {
  const indexes = await sourceDb.collection(collectionName).indexes();
  const secondaryIndexes = indexes.filter((index) => index.name !== "_id_");

  if (secondaryIndexes.length === 0) {
    return;
  }

  await targetDb.collection(collectionName).createIndexes(
    secondaryIndexes.map((index) => {
      const { key, name, v, ns, ...options } = index;
      return {
        key,
        name,
        ...options,
      };
    }),
  );
}

async function copyCollection(
  sourceDb: mongoose.mongo.Db,
  targetDb: mongoose.mongo.Db,
  collectionName: string,
) {
  const sourceCollection = sourceDb.collection(collectionName);
  const targetCollection = targetDb.collection(collectionName);

  await targetDb.dropCollection(collectionName).catch((error: unknown) => {
    if (error instanceof Error && error.message.includes("ns not found")) {
      return;
    }
    throw error;
  });

  await targetDb.createCollection(collectionName);

  let batch: mongoose.mongo.Document[] = [];
  for await (const doc of sourceCollection.find({})) {
    batch.push(doc);

    if (batch.length >= DEFAULT_BATCH_SIZE) {
      await targetCollection.insertMany(batch, { ordered: true });
      batch = [];
    }
  }

  if (batch.length > 0) {
    await targetCollection.insertMany(batch, { ordered: true });
  }

  await recreateIndexes(sourceDb, targetDb, collectionName);
}

async function applyPlan(sourceDb: mongoose.mongo.Db, targetDb: mongoose.mongo.Db, plan: CollectionPlan[]) {
  const backupDir = await createBackup(targetDb, plan);
  console.log(`[db:sync-test-from-prod] Backup local creado en ${backupDir}`);

  for (const item of plan) {
    if (item.action === "preserve") {
      console.log(`[db:sync-test-from-prod] Preservando ${item.name}`);
      continue;
    }

    if (item.action === "drop-target-only") {
      console.log(`[db:sync-test-from-prod] Eliminando ${item.name} de test`);
      await targetDb.dropCollection(item.name);
      continue;
    }

    console.log(`[db:sync-test-from-prod] Copiando ${item.name}`);
    await copyCollection(sourceDb, targetDb, item.name);
  }
}

function assertSafeDatabaseNames(sourceDb: mongoose.mongo.Db, targetDb: mongoose.mongo.Db) {
  if (sourceDb.databaseName !== SOURCE_DB_NAME || targetDb.databaseName !== TARGET_DB_NAME) {
    throw new Error(
      `Unsafe database names. Expected source=${SOURCE_DB_NAME} and target=${TARGET_DB_NAME}, got source=${sourceDb.databaseName} target=${targetDb.databaseName}.`,
    );
  }

  if (sourceDb.databaseName === targetDb.databaseName) {
    throw new Error("Source and target databases must be different.");
  }
}

async function main() {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    return;
  }

  const uri = getMongoUri();
  const client = new mongoose.mongo.MongoClient(uri, { readPreference: "primary" });

  await client.connect();
  try {
    const sourceDb = client.db(SOURCE_DB_NAME);
    const targetDb = client.db(TARGET_DB_NAME);

    assertSafeDatabaseNames(sourceDb, targetDb);

    const plan = await buildPlan(sourceDb, targetDb);
    printPlan(plan, args.confirm);

    if (!args.confirm) {
      return;
    }

    await applyPlan(sourceDb, targetDb, plan);

    const verificationPlan = await buildPlan(sourceDb, targetDb);
    const mismatches = verificationPlan.filter(
      (item) => item.action === "replace" && item.sourceCount !== item.targetCount,
    );

    if (mismatches.length > 0) {
      const details = mismatches.map((item) => `${item.name}: prod=${item.sourceCount}, test=${item.targetCount}`);
      throw new Error(`Post-sync count mismatch: ${details.join("; ")}`);
    }

    console.log("[db:sync-test-from-prod] Sync completado correctamente.");
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  console.error("[db:sync-test-from-prod] Error:", error);
  process.exit(1);
});
