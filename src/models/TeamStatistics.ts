import mongoose, { Schema } from "mongoose";
import { TeamStatistics } from "../types";

const OffensiveTeamStatsSchema = new Schema({
  totalYards: { type: Number, default: 0 },
  passingYards: { type: Number, default: 0 },
  rushingYards: { type: Number, default: 0 },
  touchdowns: { type: Number, default: 0 },
  fieldGoals: { type: Number, default: 0 },
  firstDowns: { type: Number, default: 0 },
  thirdDownConversions: {
    made: { type: Number, default: 0 },
    attempted: { type: Number, default: 0 },
  },
  redZoneEfficiency: {
    scores: { type: Number, default: 0 },
    attempts: { type: Number, default: 0 },
  },
  averageYardsPerGame: { type: Number, default: 0 },
  averagePointsPerGame: { type: Number, default: 0 },
});

const DefensiveTeamStatsSchema = new Schema({
  totalYardsAllowed: { type: Number, default: 0 },
  passingYardsAllowed: { type: Number, default: 0 },
  rushingYardsAllowed: { type: Number, default: 0 },
  touchdownsAllowed: { type: Number, default: 0 },
  interceptions: { type: Number, default: 0 },
  fumbleRecoveries: { type: Number, default: 0 },
  sacks: { type: Number, default: 0 },
  safeties: { type: Number, default: 0 },
  averageYardsAllowedPerGame: { type: Number, default: 0 },
  averagePointsAllowedPerGame: { type: Number, default: 0 },
});

const TeamStatisticsSchema = new Schema(
  {
    team: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    tournament: { type: Schema.Types.ObjectId, ref: "Tournament", required: true },
    division: { type: Schema.Types.ObjectId, ref: "Division", required: true },

    // Record
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    ties: { type: Number, default: 0 },

    // Puntos
    pointsFor: { type: Number, default: 0 },
    pointsAgainst: { type: Number, default: 0 },
    pointsDifferential: { type: Number, default: 0 },

    // Estadísticas ofensivas
    offensiveStats: { type: OffensiveTeamStatsSchema, required: true },

    // Estadísticas defensivas
    defensiveStats: { type: DefensiveTeamStatsSchema, required: true },

    // Otros
    turnovers: { type: Number, default: 0 },
    turnoverDifferential: { type: Number, default: 0 },
    penalties: { type: Number, default: 0 },
    penaltyYards: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    collection: "team_statistics",
  }
);

// Índices
TeamStatisticsSchema.index({ team: 1, tournament: 1, division: 1 }, { unique: true });
TeamStatisticsSchema.index({ tournament: 1, division: 1 });
TeamStatisticsSchema.index({ team: 1 });

export const TeamStatisticsModel =
  mongoose.models.TeamStatistics || mongoose.model<TeamStatistics>("TeamStatistics", TeamStatisticsSchema);
