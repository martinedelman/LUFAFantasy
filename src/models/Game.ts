import mongoose, { Schema } from "mongoose";
import { Game } from "../types";

const OfficialSchema = new Schema({
  name: { type: String, required: true, trim: true },
  role: {
    type: String,
    enum: ["referee", "umpire", "linesman", "field_judge"],
    required: true,
  },
  certification: { type: String, trim: true },
});

const WeatherConditionsSchema = new Schema({
  temperature: { type: Number },
  humidity: { type: Number },
  windSpeed: { type: Number },
  conditions: { type: String, trim: true },
});

const GameVenueSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const QuarterScoreSchema = new Schema({
  q1: { type: Number, default: 0 },
  q2: { type: Number, default: 0 },
  q3: { type: Number, default: 0 },
  q4: { type: Number, default: 0 },
  overtime: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
});

const GameScoreSchema = new Schema({
  home: { type: QuarterScoreSchema, required: true },
  away: { type: QuarterScoreSchema, required: true },
});

const TeamGameStatsSchema = new Schema({
  passingYards: { type: Number, default: 0 },
  rushingYards: { type: Number, default: 0 },
  totalYards: { type: Number, default: 0 },
  completions: { type: Number, default: 0 },
  attempts: { type: Number, default: 0 },
  interceptions: { type: Number, default: 0 },
  fumbles: { type: Number, default: 0 },
  penalties: { type: Number, default: 0 },
  penaltyYards: { type: Number, default: 0 },
  timeOfPossession: { type: String },
  thirdDownConversions: {
    made: { type: Number, default: 0 },
    attempted: { type: Number, default: 0 },
  },
  redZoneEfficiency: {
    scores: { type: Number, default: 0 },
    attempts: { type: Number, default: 0 },
  },
});

const GameStatisticsSchema = new Schema({
  home: { type: TeamGameStatsSchema, required: true },
  away: { type: TeamGameStatsSchema, required: true },
});

const GameEventSchema = new Schema({
  quarter: { type: Number, required: true, min: 1, max: 5 },
  time: { type: String, required: true }, // MM:SS format
  type: {
    type: String,
    enum: [
      "touchdown",
      "extra_point",
      "field_goal",
      "safety",
      "interception",
      "fumble",
      "penalty",
      "timeout",
      "quarter_end",
      "game_end",
      "substitution",
      "injury",
      "first_down",
      "sack",
    ],
    required: true,
  },
  team: { type: Schema.Types.ObjectId, ref: "Team", required: true },
  player: { type: Schema.Types.ObjectId, ref: "Player" },
  description: { type: String, required: true, trim: true },
  yards: { type: Number },
  points: { type: Number },
  details: { type: Schema.Types.Mixed },
});

const GameSchema = new Schema(
  {
    tournament: { type: Schema.Types.ObjectId, ref: "Tournament", required: true },
    division: { type: Schema.Types.ObjectId, ref: "Division", required: true },
    homeTeam: { type: Schema.Types.ObjectId, ref: "Team", default: null },
    awayTeam: { type: Schema.Types.ObjectId, ref: "Team", default: null },
    venue: { type: GameVenueSchema, required: true },
    scheduledDate: { type: Date, required: true },
    actualStartTime: { type: Date },
    actualEndTime: { type: Date },
    status: {
      type: String,
      enum: ["scheduled", "in_progress", "completed", "postponed", "cancelled"],
      default: "scheduled",
    },
    week: { type: Number },
    round: { type: String, trim: true },
    officials: [{ type: OfficialSchema }],
    weather: { type: WeatherConditionsSchema },
    score: { type: GameScoreSchema, required: true },
    statistics: { type: GameStatisticsSchema, required: true },
    events: [{ type: GameEventSchema }],
    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
    collection: "games",
  },
);

// Índices
GameSchema.index({ tournament: 1, division: 1 });
GameSchema.index(
  { homeTeam: 1, awayTeam: 1, scheduledDate: 1 },
  {
    unique: true,
    partialFilterExpression: {
      homeTeam: { $type: "objectId" },
      awayTeam: { $type: "objectId" },
    },
  },
);
GameSchema.index({ scheduledDate: 1 });
GameSchema.index({ status: 1 });
GameSchema.index({ week: 1 });

export const GameModel = mongoose.models.Game || mongoose.model<Game>("Game", GameSchema);
