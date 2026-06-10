import mongoose, { Schema } from "mongoose";
import type { GameEventType } from "../entities/Game";

export interface GameEventDocument {
  _id?: unknown;
  game: unknown;
  tournament: unknown;
  division: unknown;
  team: unknown;
  player?: unknown;
  qb?: unknown;
  qbStatValue?: number;
  quarter: number;
  sequence: number;
  time?: string;
  type: GameEventType;
  description?: string;
  yards?: number;
  points?: number;
  details?: unknown;
  createdAt?: Date;
  updatedAt?: Date;
}

const GameEventSchema = new Schema(
  {
    game: { type: Schema.Types.ObjectId, ref: "Game", required: true },
    tournament: { type: Schema.Types.ObjectId, ref: "Tournament", required: true },
    division: { type: Schema.Types.ObjectId, ref: "Division", required: true },
    team: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    player: { type: Schema.Types.ObjectId, ref: "Player" },
    qb: { type: Schema.Types.ObjectId, ref: "Player" },
    qbStatValue: { type: Number },
    quarter: { type: Number, required: true, min: 1, max: 5 },
    sequence: { type: Number, required: true, min: 0 },
    time: { type: String },
    type: {
      type: String,
      enum: [
        "touchdown",
        "extra_point",
        "field_goal",
        "safety",
        "interception",
        "pick_six",
        "penalty",
        "unsportsmanlike",
        "quarter_end",
        "game_end",
        "substitution",
        "injury",
        "first_down",
        "sack",
      ],
      required: true,
    },
    description: { type: String, trim: true },
    yards: { type: Number },
    points: { type: Number },
    details: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    collection: "game_events",
  },
);

GameEventSchema.index({ game: 1, sequence: 1 });
GameEventSchema.index({ division: 1, type: 1, points: 1, player: 1 });
GameEventSchema.index({ tournament: 1, division: 1, type: 1, points: 1, player: 1 });
GameEventSchema.index({ player: 1, game: 1 });
GameEventSchema.index({ qb: 1, game: 1 });
GameEventSchema.index({ team: 1, game: 1 });
GameEventSchema.index({ game: 1, _id: 1 }, { unique: true });

export const GameEventModel =
  mongoose.models.GameEvent || mongoose.model<GameEventDocument>("GameEvent", GameEventSchema);
