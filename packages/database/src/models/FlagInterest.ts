import mongoose, { Schema, Document } from "mongoose";

export type FlagInterestType = "play" | "child" | "team" | "coach" | "referee" | "sponsor" | "school" | "other";

export interface IFlagInterest extends Document {
  interestType: FlagInterestType;
  interestLabel: string;
  name: string;
  ageRange: string;
  location: string;
  whatsapp: string;
  whatsappDigits: string;
  experience?: string;
  company?: string;
  sponsorInterest?: string;
  source: "sumate";
  createdAt: Date;
  updatedAt: Date;
}

const FlagInterestSchema = new Schema<IFlagInterest>(
  {
    interestType: {
      type: String,
      enum: ["play", "child", "team", "coach", "referee", "sponsor", "school", "other"],
      required: true,
    },
    interestLabel: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    ageRange: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    whatsapp: {
      type: String,
      required: true,
      trim: true,
    },
    whatsappDigits: {
      type: String,
      required: true,
      trim: true,
    },
    experience: {
      type: String,
      trim: true,
      default: "",
    },
    company: {
      type: String,
      trim: true,
      default: "",
    },
    sponsorInterest: {
      type: String,
      trim: true,
      default: "",
    },
    source: {
      type: String,
      enum: ["sumate"],
      default: "sumate",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

FlagInterestSchema.index({ interestType: 1, createdAt: -1 });
FlagInterestSchema.index({ whatsappDigits: 1, createdAt: -1 });

export const FlagInterestModel =
  mongoose.models.FlagInterest || mongoose.model<IFlagInterest>("FlagInterest", FlagInterestSchema);
