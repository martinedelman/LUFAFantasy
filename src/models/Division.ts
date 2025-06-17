import mongoose, { Schema } from "mongoose";
import { Division } from "../types";

const DivisionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["masculino", "femenino", "mixto"],
      required: true,
    },
    ageGroup: { type: String, trim: true },
    tournament: { type: Schema.Types.ObjectId, ref: "Tournament", required: true },
    teams: [{ type: Schema.Types.ObjectId, ref: "Team" }],
    maxTeams: { type: Number },
  },
  {
    timestamps: true,
    collection: "divisions",
  }
);

// Índices
DivisionSchema.index({ tournament: 1, name: 1 }, { unique: true });
DivisionSchema.index({ category: 1 });

export const DivisionModel = mongoose.models.Division || mongoose.model<Division>("Division", DivisionSchema);
