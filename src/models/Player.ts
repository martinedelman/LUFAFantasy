import mongoose, { Schema } from "mongoose";
import { Player } from "../types";

const EmergencyContactSchema = new Schema({
  name: { type: String, required: true, trim: true },
  relationship: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
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
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    dateOfBirth: { type: Date, required: true },
    team: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    jerseyNumber: { type: Number, required: true },
    position: {
      type: String,
      enum: ["QB", "WR", "RB", "C", "G", "T", "DE", "DT", "LB", "CB", "FS", "SS", "K", "P", "FLEX"],
      required: true,
    },
    height: { type: Number }, // cm
    weight: { type: Number }, // kg
    experience: { type: String, trim: true },
    emergencyContact: { type: EmergencyContactSchema },
    medicalInfo: { type: MedicalInfoSchema },
    registrationDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["active", "inactive", "injured", "suspended"],
      default: "active",
    },
  },
  {
    timestamps: true,
    collection: "players",
  }
);

// Índices
PlayerSchema.index({ team: 1, jerseyNumber: 1 }, { unique: true });
PlayerSchema.index({ firstName: 1, lastName: 1 });
PlayerSchema.index({ team: 1 });
PlayerSchema.index({ position: 1 });
PlayerSchema.index({ status: 1 });

export const PlayerModel = mongoose.models.Player || mongoose.model<Player>("Player", PlayerSchema);
