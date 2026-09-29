/**
 * LUFA plays two disciplines that share teams, players and the same API.
 * Tournaments and divisions belong to one of them; everything else inherits it.
 */
export const MODALITIES = ["flag", "tackle"] as const;

export type Modality = (typeof MODALITIES)[number];

/** Data created before tackle existed, and callers that omit it, are flag. */
export const DEFAULT_MODALITY: Modality = "flag";

export function isModality(value: unknown): value is Modality {
  return typeof value === "string" && (MODALITIES as readonly string[]).includes(value);
}
