import { DEFAULT_MODALITY, isModality } from "@lufa/sports/entities/Modality";

/**
 * MongoDB only holds the historical flag data and has no modality field.
 * Returns the query without `modality`, or null when the caller asked for
 * another modality (there is nothing to find).
 */
export function withoutModality(filters?: Record<string, unknown>): Record<string, unknown> | null {
  if (!filters || !("modality" in filters)) return filters || {};
  const { modality, ...rest } = filters;
  if (isModality(modality) && modality !== DEFAULT_MODALITY) return null;
  return rest;
}
