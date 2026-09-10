import mongoose, { Schema, Document } from "mongoose";

export interface IAdminAuditLog extends Document {
  actorId: mongoose.Types.ObjectId;
  actorName: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  summary: string;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const AdminAuditLogSchema = new Schema<IAdminAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    actorName: { type: String, required: true, trim: true },
    actorEmail: { type: String, required: true, trim: true, lowercase: true },
    action: { type: String, required: true, trim: true },
    entityType: { type: String, required: true, trim: true },
    entityId: { type: String, trim: true },
    entityLabel: { type: String, trim: true },
    summary: { type: String, required: true, trim: true },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    collection: "admin_audit_logs",
  },
);

AdminAuditLogSchema.index({ createdAt: -1 });
AdminAuditLogSchema.index({ actorEmail: 1, createdAt: -1 });
AdminAuditLogSchema.index({ action: 1, createdAt: -1 });
AdminAuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export const AdminAuditLogModel =
  mongoose.models.AdminAuditLog || mongoose.model<IAdminAuditLog>("AdminAuditLog", AdminAuditLogSchema);
