import mongoose, { Schema } from "mongoose";
import { Tournament, TournamentRules, ScoringRules, Prize } from "../types";

const ScoringRulesSchema = new Schema<ScoringRules>({
  touchdown: { type: Number, required: true, default: 6 },
  extraPoint1Yard: { type: Number, required: true, default: 1 },
  extraPoint5Yard: { type: Number, required: true, default: 2 },
  extraPoint10Yard: { type: Number, required: true, default: 3 },
  safety: { type: Number, required: true, default: 2 },
  fieldGoal: { type: Number, default: 3 },
});

const TournamentRulesSchema = new Schema<TournamentRules>({
  gameDuration: { type: Number, required: true, default: 40 },
  quarters: { type: Number, required: true, default: 4 },
  timeoutsPerTeam: { type: Number, required: true, default: 3 },
  playersPerTeam: { type: Number, required: true, default: 7 },
  minimumPlayers: { type: Number, required: true, default: 5 },
  overtimeRules: { type: String },
  scoringRules: { type: ScoringRulesSchema, required: true },
});

const PrizeSchema = new Schema<Prize>({
  position: { type: Number, required: true },
  description: { type: String, required: true },
  amount: { type: Number },
  trophy: { type: String },
});

const TournamentSchema = new Schema<Tournament>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    season: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    registrationDeadline: { type: Date },
    status: {
      type: String,
      enum: ["upcoming", "active", "completed", "cancelled"],
      default: "upcoming",
    },
    format: {
      type: String,
      enum: ["league", "playoff", "tournament"],
      default: "league",
    },
    divisions: [{ type: Schema.Types.ObjectId, ref: "Division" }],
    rules: { type: TournamentRulesSchema },
    prizes: [PrizeSchema],
  },
  {
    timestamps: true,
    collection: "tournaments",
  }
);

// Índices
TournamentSchema.index({ name: 1, year: 1 }, { unique: true });
TournamentSchema.index({ status: 1 });
TournamentSchema.index({ startDate: 1 });

export const TournamentModel =
  mongoose.models.Tournament || mongoose.model<Tournament>("Tournament", TournamentSchema);
