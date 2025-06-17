import mongoose, { Schema } from "mongoose";
import { PlayerStatistics } from "../types";

const PassingStatsSchema = new Schema({
  attempts: { type: Number, default: 0 },
  completions: { type: Number, default: 0 },
  yards: { type: Number, default: 0 },
  touchdowns: { type: Number, default: 0 },
  interceptions: { type: Number, default: 0 },
  sacks: { type: Number, default: 0 },
  rating: { type: Number },
  longestPass: { type: Number },
});

const RushingStatsSchema = new Schema({
  attempts: { type: Number, default: 0 },
  yards: { type: Number, default: 0 },
  touchdowns: { type: Number, default: 0 },
  fumbles: { type: Number, default: 0 },
  longestRush: { type: Number },
  averageYards: { type: Number },
});

const ReceivingStatsSchema = new Schema({
  receptions: { type: Number, default: 0 },
  yards: { type: Number, default: 0 },
  touchdowns: { type: Number, default: 0 },
  targets: { type: Number, default: 0 },
  drops: { type: Number, default: 0 },
  longestReception: { type: Number },
  averageYards: { type: Number },
});

const DefensiveStatsSchema = new Schema({
  tackles: { type: Number, default: 0 },
  assistedTackles: { type: Number, default: 0 },
  sacks: { type: Number, default: 0 },
  interceptions: { type: Number, default: 0 },
  passDefensed: { type: Number, default: 0 },
  forcedFumbles: { type: Number, default: 0 },
  fumbleRecoveries: { type: Number, default: 0 },
  defensiveTouchdowns: { type: Number, default: 0 },
  safeties: { type: Number, default: 0 },
});

const KickingStatsSchema = new Schema({
  fieldGoalAttempts: { type: Number, default: 0 },
  fieldGoalsMade: { type: Number, default: 0 },
  extraPointAttempts: { type: Number, default: 0 },
  extraPointsMade: { type: Number, default: 0 },
  longestFieldGoal: { type: Number },
  accuracy: { type: Number },
});

const PuntingStatsSchema = new Schema({
  punts: { type: Number, default: 0 },
  yards: { type: Number, default: 0 },
  average: { type: Number, default: 0 },
  longest: { type: Number, default: 0 },
  inside20: { type: Number, default: 0 },
  touchbacks: { type: Number, default: 0 },
});

const ReturningStatsSchema = new Schema({
  kickReturns: { type: Number, default: 0 },
  kickReturnYards: { type: Number, default: 0 },
  kickReturnTouchdowns: { type: Number, default: 0 },
  puntReturns: { type: Number, default: 0 },
  puntReturnYards: { type: Number, default: 0 },
  puntReturnTouchdowns: { type: Number, default: 0 },
});

const PlayerStatisticsSchema = new Schema(
  {
    player: { type: Schema.Types.ObjectId, ref: "Player", required: true },
    tournament: { type: Schema.Types.ObjectId, ref: "Tournament", required: true },
    division: { type: Schema.Types.ObjectId, ref: "Division", required: true },

    // Estadísticas ofensivas
    passing: { type: PassingStatsSchema, required: true },
    rushing: { type: RushingStatsSchema, required: true },
    receiving: { type: ReceivingStatsSchema, required: true },

    // Estadísticas defensivas
    defensive: { type: DefensiveStatsSchema, required: true },

    // Estadísticas especiales
    kicking: { type: KickingStatsSchema },
    punting: { type: PuntingStatsSchema },
    returning: { type: ReturningStatsSchema },

    // Estadísticas generales
    gamesPlayed: { type: Number, default: 0 },
    gamesStarted: { type: Number, default: 0 },
    minutesPlayed: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    collection: "player_statistics",
  }
);

// Índices
PlayerStatisticsSchema.index({ player: 1, tournament: 1, division: 1 }, { unique: true });
PlayerStatisticsSchema.index({ tournament: 1, division: 1 });
PlayerStatisticsSchema.index({ player: 1 });

export const PlayerStatisticsModel =
  mongoose.models.PlayerStatistics ||
  mongoose.model<PlayerStatistics>("PlayerStatistics", PlayerStatisticsSchema);
