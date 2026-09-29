"use client";

import { MODALITY_RULES, POSITION_LABELS, type PlayerPosition } from "@lufa/contracts/game-events";
import { useSiteConfig } from "../site/SiteConfig";

/**
 * `<option>`s for the site's modality positions. A current value from the other
 * modality is kept so editing a shared player never silently drops it.
 */
export default function PositionOptions({ current, withCode = true }: { current?: string; withCode?: boolean }) {
  const { modality } = useSiteConfig();
  const positions: string[] = [...MODALITY_RULES[modality].positions];
  if (current && !positions.includes(current)) positions.push(current);

  return (
    <>
      {positions.map((position) => {
        const label = POSITION_LABELS[position as PlayerPosition] || position;
        return (
          <option key={position} value={position}>
            {withCode ? `${label} (${position})` : label}
          </option>
        );
      })}
    </>
  );
}
