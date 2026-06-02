import mongoose from "mongoose";
import connectToDatabase from "../src/lib/mongodb";
import { PlayerModel } from "../src/models/Player";

const OLD_SENTINEL = new Date("2000-01-01T00:00:00.000Z");
const NEW_SENTINEL = new Date("1900-01-01T00:00:00.000Z");

async function run() {
  await connectToDatabase();

  const [updatedFromOldSentinel, updatedFromNull] = await Promise.all([
    PlayerModel.updateMany(
      { dateOfBirth: OLD_SENTINEL },
      { $set: { dateOfBirth: NEW_SENTINEL } },
      { runValidators: false },
    ),
    PlayerModel.updateMany({ dateOfBirth: null }, { $set: { dateOfBirth: NEW_SENTINEL } }, { runValidators: false }),
  ]);

  console.log(
    `[normalize-player-birthdate-sentinel] Actualizados desde 2000-01-01: ${updatedFromOldSentinel.modifiedCount}`,
  );
  console.log(`[normalize-player-birthdate-sentinel] Actualizados desde null: ${updatedFromNull.modifiedCount}`);
}

run()
  .then(async () => {
    await mongoose.connection.close();
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    console.error("[normalize-player-birthdate-sentinel] Error:", error);
    await mongoose.connection.close();
    process.exit(1);
  });
