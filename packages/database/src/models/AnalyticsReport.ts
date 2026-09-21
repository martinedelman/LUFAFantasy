import mongoose, { Schema } from "mongoose";

const AnalyticsReportSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: "", maxlength: 500 },
    scope: { type: String, enum: ["personal", "template"], default: "personal", index: true },
    filters: { type: Schema.Types.Mixed, default: {} },
    widgets: { type: [Schema.Types.Mixed], default: [] },
    layouts: { type: Schema.Types.Mixed, default: {} },
    version: { type: Number, default: 1, min: 1 },
  },
  { timestamps: true, collection: "analytics_reports" },
);

AnalyticsReportSchema.index({ owner: 1, scope: 1, updatedAt: -1 });

export const AnalyticsReportModel =
  mongoose.models.AnalyticsReport || mongoose.model("AnalyticsReport", AnalyticsReportSchema);
