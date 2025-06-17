import mongoose, { Schema } from "mongoose";
import { Standing } from "../types";

const StandingSchema = new Schema(
  {
    division: { type: Schema.Types.ObjectId, ref: "Division", required: true },
    team: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    position: { type: Number, required: true },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    ties: { type: Number, default: 0 },
    pointsFor: { type: Number, default: 0 },
    pointsAgainst: { type: Number, default: 0 },
    pointsDifferential: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    streak: { type: String, trim: true },
    lastFiveGames: { type: String, trim: true },
    homeRecord: {
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 },
      ties: { type: Number, default: 0 },
    },
    awayRecord: {
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 },
      ties: { type: Number, default: 0 },
    },
    divisionRecord: {
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 },
      ties: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    collection: "standings",
  }
);

// Índices
StandingSchema.index({ division: 1, team: 1 }, { unique: true });
StandingSchema.index({ division: 1, position: 1 });
StandingSchema.index({ division: 1, percentage: -1 });

export const StandingModel = mongoose.models.Standing || mongoose.model<Standing>("Standing", StandingSchema);
