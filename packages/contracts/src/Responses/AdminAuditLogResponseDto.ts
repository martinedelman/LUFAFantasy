export interface AdminAuditLogResponseDto {
  id: string;
  actorId: string;
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
  createdAt: string;
}
