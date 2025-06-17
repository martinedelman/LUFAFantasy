import mongoose, { Schema } from "mongoose";
import { Season } from "../types";

const SeasonSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    tournaments: [{ type: Schema.Types.ObjectId, ref: "Tournament" }],
    status: {
      type: String,
      enum: ["upcoming", "active", "completed"],
      default: "upcoming",
    },
  },
  {
    timestamps: true,
    collection: "seasons",
  }
);

// Índices
SeasonSchema.index({ name: 1, year: 1 }, { unique: true });
SeasonSchema.index({ year: 1 });
SeasonSchema.index({ status: 1 });

export const SeasonModel = mongoose.models.Season || mongoose.model<Season>("Season", SeasonSchema);
