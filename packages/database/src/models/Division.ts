import mongoose, { Schema } from "mongoose";
import { Division } from "@lufa/contracts/legacy-types";

const DivisionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["masculino", "femenino", "mixto"],
      required: true,
    },
    ageGroup: { type: String, trim: true },
    tournament: { type: Schema.Types.ObjectId, ref: "Tournament" },
    teams: [{ type: Schema.Types.ObjectId, ref: "Team" }],
    maxTeams: { type: Number },
  },
  {
    timestamps: true,
    collection: "divisions",
  },
);

// Índices
DivisionSchema.index({ name: 1, category: 1 });
DivisionSchema.index({ category: 1 });

export const DivisionModel = mongoose.models.Division || mongoose.model<Division>("Division", DivisionSchema);
