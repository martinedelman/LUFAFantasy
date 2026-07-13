export type PlayoffCriteria = "NFL" | "DIRECT_FINAL" | "SEMIFINAL";
export type PlayoffSlotPhase = "playoff" | "final";

export type PlayoffSlotDefinition = {
  id: string;
  label: string;
  phase: PlayoffSlotPhase;
};

export const PLAYOFF_SLOT_DEFINITIONS: Record<PlayoffCriteria, PlayoffSlotDefinition[]> = {
  NFL: [
    { id: "playin_2_7", label: "Eliminatoria 2° vs 7°", phase: "playoff" },
    { id: "playin_3_6", label: "Eliminatoria 3° vs 6°", phase: "playoff" },
    { id: "playin_4_5", label: "Eliminatoria 4° vs 5°", phase: "playoff" },
    { id: "semifinal_1_lowest_winner", label: "Semifinal 1° vs peor ganador", phase: "playoff" },
    { id: "semifinal_remaining", label: "Semifinal restante", phase: "playoff" },
    { id: "final", label: "Final", phase: "final" },
  ],
  SEMIFINAL: [
    { id: "semifinal_1_4", label: "Semifinal 1° vs 4°", phase: "playoff" },
    { id: "semifinal_2_3", label: "Semifinal 2° vs 3°", phase: "playoff" },
    { id: "final", label: "Final", phase: "final" },
  ],
  DIRECT_FINAL: [{ id: "final", label: "Final directa", phase: "final" }],
};

export const DEFAULT_PLAYOFF_CRITERIA: PlayoffCriteria = "NFL";

export function getPlayoffSlotDefinitions(criteria?: PlayoffCriteria): PlayoffSlotDefinition[] {
  return PLAYOFF_SLOT_DEFINITIONS[criteria || DEFAULT_PLAYOFF_CRITERIA];
}

export function getPlayoffSlotDefinition(criteria: PlayoffCriteria | undefined, slotId?: string) {
  if (!slotId) return undefined;
  return getPlayoffSlotDefinitions(criteria).find((slot) => slot.id === slotId);
}
