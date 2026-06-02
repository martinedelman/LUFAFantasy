import mongoose, { Schema } from "mongoose";
import { Judge } from "../types";

const JudgeSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
  },
  {
    timestamps: true,
    collection: "judges",
  },
);

JudgeSchema.index({ firstName: 1, lastName: 1 });

export const JudgeModel = mongoose.models.Judge || mongoose.model<Judge>("Judge", JudgeSchema);
