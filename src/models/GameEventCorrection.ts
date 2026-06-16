import mongoose, { Schema } from "mongoose";
import type { GameEventType } from "../entities/Game";

export type GameEventCorrectionOperation = "create" | "update" | "delete";
export type GameEventCorrectionStatus = "pending" | "approved" | "rejected";

export interface GameEventCorrectionPayload {
  quarter: number;
  type: GameEventType;
  team: unknown;
  player?: unknown;
  points?: number;
  details?: unknown;
}

export interface GameEventCorrectionDocument {
  _id?: unknown;
  game: unknown;
  event?: unknown;
  operation: GameEventCorrectionOperation;
  status: GameEventCorrectionStatus;
  proposedEvent?: GameEventCorrectionPayload;
  originalEvent?: GameEventCorrectionPayload;
  requestedBy: unknown;
  requestedByName?: string;
  requestedByEmail?: string;
  reviewedBy?: unknown;
  reviewedAt?: Date;
  reviewNote?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const GameEventCorrectionPayloadSchema = new Schema(
  {
    quarter: { type: Number, required: true, min: 1, max: 5 },
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
    team: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    player: { type: Schema.Types.ObjectId, ref: "Player" },
    points: { type: Number },
    details: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const GameEventCorrectionSchema = new Schema(
  {
    game: { type: Schema.Types.ObjectId, ref: "Game", required: true },
    event: { type: Schema.Types.ObjectId, ref: "GameEvent" },
    operation: { type: String, enum: ["create", "update", "delete"], required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", required: true },
    proposedEvent: { type: GameEventCorrectionPayloadSchema },
    originalEvent: { type: GameEventCorrectionPayloadSchema },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    requestedByName: { type: String, trim: true },
    requestedByEmail: { type: String, trim: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewNote: { type: String, trim: true },
  },
  {
    timestamps: true,
    collection: "game_event_corrections",
  },
);

GameEventCorrectionSchema.index({ status: 1, createdAt: 1 });
GameEventCorrectionSchema.index({ game: 1, status: 1 });
GameEventCorrectionSchema.index({ requestedBy: 1, status: 1 });

export const GameEventCorrectionModel =
  mongoose.models.GameEventCorrection ||
  mongoose.model<GameEventCorrectionDocument>("GameEventCorrection", GameEventCorrectionSchema);
