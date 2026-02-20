import mongoose, { Schema } from "mongoose";
import { Team } from "../types";

const CoachSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  experience: { type: String, trim: true },
  certifications: [{ type: String, trim: true }],
});

const ContactInfoSchema = new Schema({
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  address: { type: String, trim: true },
  socialMedia: {
    facebook: { type: String, trim: true },
    instagram: { type: String, trim: true },
    twitter: { type: String, trim: true },
  },
});

const TeamSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    shortName: { type: String, trim: true },
    logo: { type: String, trim: true },
    colors: {
      primary: { type: String, required: true, trim: true },
      secondary: { type: String, trim: true },
    },
    division: { type: Schema.Types.ObjectId, ref: "Division", required: true },
    coach: { type: CoachSchema },
    players: [{ type: Schema.Types.ObjectId, ref: "Player" }],
    contact: { type: ContactInfoSchema, required: true },
    registrationDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
  },
  {
    timestamps: true,
    collection: "teams",
  },
);

// Índices
TeamSchema.index({ name: 1, division: 1 }, { unique: true });
TeamSchema.index({ division: 1 });
TeamSchema.index({ status: 1 });

export const TeamModel = mongoose.models.Team || mongoose.model<Team>("Team", TeamSchema);
