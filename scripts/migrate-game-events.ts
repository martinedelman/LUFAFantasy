import mongoose from "mongoose";
import connectToDatabase from "../src/lib/mongodb";
import { GameModel, GameEventModel } from "../src/models";

type LegacyGameEvent = {
  _id?: unknown;
  quarter?: number;
  time?: string;
  type?: string;
  team?: unknown;
  player?: unknown;
  description?: string;
  yards?: number;
  points?: number;
  details?: unknown;
};

type LegacyGame = {
  _id: mongoose.Types.ObjectId;
  tournament?: unknown;
  division?: unknown;
  homeTeam?: unknown;
  awayTeam?: unknown;
  score?: {
    home?: { q1?: number; q2?: number; q3?: number; q4?: number; overtime?: number; total?: number };
    away?: { q1?: number; q2?: number; q3?: number; q4?: number; overtime?: number; total?: number };
  };
  events?: LegacyGameEvent[];
};

type QuarterTotals = {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  overtime: number;
};

const dryRun = process.argv.includes("--dry-run");

function getReferenceId(reference: unknown): string {
  if (!reference) return "";
  if (typeof reference === "string") return reference;
  if (reference instanceof mongoose.Types.ObjectId) return reference.toString();
  if (typeof reference === "object" && "_id" in reference) {
    const id = (reference as { _id?: unknown })._id;
    return id ? id.toString() : "";
  }
  return reference.toString();
}

function toObjectId(reference: unknown): mongoose.Types.ObjectId | undefined {
  const id = getReferenceId(reference);
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : undefined;
}

function extractEventDetails(details: unknown): { qb?: mongoose.Types.ObjectId; qbStatValue?: number } {
  if (!details || typeof details !== "object") {
    return {};
  }

  const eventDetails = details as { qb?: unknown; qbStatValue?: unknown };
  const qb = toObjectId(eventDetails.qb);
  const qbStatValue = Number(eventDetails.qbStatValue);

  return {
    ...(qb ? { qb } : {}),
    ...(Number.isFinite(qbStatValue) ? { qbStatValue } : {}),
  };
}

function emptyQuarters(): QuarterTotals {
  return { q1: 0, q2: 0, q3: 0, q4: 0, overtime: 0 };
}

function recalculateScore(game: LegacyGame, events: LegacyGameEvent[]) {
  const totals = {
    home: emptyQuarters(),
    away: emptyQuarters(),
  };
  const homeTeamId = getReferenceId(game.homeTeam);

  for (const event of events) {
    if (!event.points || event.points <= 0) continue;

    const teamId = getReferenceId(event.team);
    const side = teamId === homeTeamId ? totals.home : totals.away;
    const quarterKey = event.quarter === 5 ? "overtime" : (`q${event.quarter || 1}` as keyof QuarterTotals);
    side[quarterKey] += event.points;
  }

  return {
    home: { ...totals.home, total: Object.values(totals.home).reduce((sum, value) => sum + value, 0) },
    away: { ...totals.away, total: Object.values(totals.away).reduce((sum, value) => sum + value, 0) },
  };
}

function scoreDiffers(game: LegacyGame, score: ReturnType<typeof recalculateScore>) {
  return (
    Number(game.score?.home?.q1 || 0) !== score.home.q1 ||
    Number(game.score?.home?.q2 || 0) !== score.home.q2 ||
    Number(game.score?.home?.q3 || 0) !== score.home.q3 ||
    Number(game.score?.home?.q4 || 0) !== score.home.q4 ||
    Number(game.score?.home?.overtime || 0) !== score.home.overtime ||
    Number(game.score?.home?.total || 0) !== score.home.total ||
    Number(game.score?.away?.q1 || 0) !== score.away.q1 ||
    Number(game.score?.away?.q2 || 0) !== score.away.q2 ||
    Number(game.score?.away?.q3 || 0) !== score.away.q3 ||
    Number(game.score?.away?.q4 || 0) !== score.away.q4 ||
    Number(game.score?.away?.overtime || 0) !== score.away.overtime ||
    Number(game.score?.away?.total || 0) !== score.away.total
  );
}

function toScoreSet(score: ReturnType<typeof recalculateScore>) {
  return {
    "score.home.q1": score.home.q1,
    "score.home.q2": score.home.q2,
    "score.home.q3": score.home.q3,
    "score.home.q4": score.home.q4,
    "score.home.overtime": score.home.overtime,
    "score.home.total": score.home.total,
    "score.away.q1": score.away.q1,
    "score.away.q2": score.away.q2,
    "score.away.q3": score.away.q3,
    "score.away.q4": score.away.q4,
    "score.away.overtime": score.away.overtime,
    "score.away.total": score.away.total,
  };
}

async function migrateGame(game: LegacyGame) {
  const events = Array.isArray(game.events) ? game.events : [];
  const score = recalculateScore(game, events);
  const hasMismatch = scoreDiffers(game, score);

  if (dryRun) {
    return {
      migrated: events.length,
      mismatch: hasMismatch,
    };
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      if (events.length > 0) {
        await GameEventModel.bulkWrite(
          events.map((event, sequence) => {
            const eventDetails = extractEventDetails(event.details);
            const eventId = toObjectId(event._id) || new mongoose.Types.ObjectId();

            return {
              updateOne: {
                filter: { _id: eventId },
                update: {
                  $set: {
                    game: game._id,
                    tournament: game.tournament,
                    division: game.division,
                    team: event.team,
                    player: event.player || undefined,
                    qb: eventDetails.qb,
                    qbStatValue: eventDetails.qbStatValue,
                    quarter: event.quarter,
                    sequence,
                    time: event.time,
                    type: event.type,
                    description: event.description,
                    yards: event.yards,
                    points: event.points,
                    details: event.details,
                  },
                  $setOnInsert: {
                    _id: eventId,
                  },
                },
                upsert: true,
              },
            };
          }),
          { session },
        );
      }

      await GameModel.collection.updateOne(
        { _id: game._id },
        {
          $set: toScoreSet(score),
          $unset: { events: "" },
        },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  return {
    migrated: events.length,
    mismatch: hasMismatch,
  };
}

async function main() {
  await connectToDatabase();

  const games = (await GameModel.collection
    .find({ events: { $exists: true, $type: "array", $ne: [] } })
    .toArray()) as LegacyGame[];

  let migratedEvents = 0;
  let mismatches = 0;

  console.log(`${dryRun ? "[dry-run] " : ""}Found ${games.length} games with legacy embedded events`);

  for (const game of games) {
    const result = await migrateGame(game);
    migratedEvents += result.migrated;
    if (result.mismatch) {
      mismatches += 1;
      console.log(`Score mismatch corrected for game ${game._id.toString()}`);
    }
    console.log(`${dryRun ? "[dry-run] " : ""}Migrated ${result.migrated} events for game ${game._id.toString()}`);
  }

  console.log(
    `${dryRun ? "[dry-run] " : ""}Done. Games: ${games.length}. Events: ${migratedEvents}. Score mismatches: ${mismatches}.`,
  );

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
