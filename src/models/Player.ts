import mongoose, { Schema } from "mongoose";
import { Player } from "../types";

const EmergencyContactSchema = new Schema({
  name: { type: String, trim: true },
  relationship: { type: String, trim: true },
  phone: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
});

const MedicalInfoSchema = new Schema({
  allergies: [{ type: String, trim: true }],
  medications: [{ type: String, trim: true }],
  conditions: [{ type: String, trim: true }],
  insuranceInfo: { type: String, trim: true },
});

const PlayerSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    profilePicture: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    dateOfBirth: { type: Date, required: true },
    team: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    jerseyNumber: { type: Number },
    position: {
      type: String,
      enum: ["QB", "WR", "RB", "C", "RS", "G", "T", "DE", "DT", "LB", "CB", "FS", "SS", "K", "P", "FLEX"],
      required: true,
    },
    secondaryPosition: {
      type: String,
      enum: ["QB", "WR", "RB", "C", "RS", "LB", "CB", "FS", "SS"],
    },
    height: { type: Number }, // cm
    weight: { type: Number }, // kg
    experience: { type: String, trim: true },
    emergencyContact: { type: EmergencyContactSchema },
    medicalInfo: { type: MedicalInfoSchema },
    registrationDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["active", "inactive", "injured", "suspended", "pre_approved"],
      default: "active",
    },
  },
  {
    timestamps: true,
    collection: "players",
  },
);

// Índices
PlayerSchema.index(
  { team: 1, jerseyNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { jerseyNumber: { $type: "number" } },
  },
);
PlayerSchema.index({ firstName: 1, lastName: 1 });
PlayerSchema.index({ team: 1 });
PlayerSchema.index({ position: 1 });
PlayerSchema.index({ secondaryPosition: 1 });
PlayerSchema.index({ status: 1 });

export const PlayerModel = mongoose.models.Player || mongoose.model<Player>("Player", PlayerSchema);
