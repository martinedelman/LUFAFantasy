export type GoogleIconName =
  | "arrow_forward"
  | "campaign"
  | "child_care"
  | "groups"
  | "handshake"
  | "school"
  | "sports_football"
  | "sports_score"
  | "strategy";

interface GoogleIconProps {
  name: GoogleIconName;
  className?: string;
}

const iconPaths: Record<GoogleIconName, string> = {
  arrow_forward: "/icons/arrow_forward_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg",
  campaign: "/icons/campaign_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg",
  child_care: "/icons/child_care_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg",
  groups: "/icons/groups_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg",
  handshake: "/icons/handshake_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg",
  school: "/icons/school_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg",
  sports_football: "/icons/sports_football_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg",
  sports_score: "/icons/sports_score_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg",
  strategy: "/icons/strategy_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg",
};

export default function GoogleIcon({ name, className = "" }: GoogleIconProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-[1em] w-[1em] shrink-0 bg-current ${className}`}
      style={{
        mask: `url(${iconPaths[name]}) center / contain no-repeat`,
        WebkitMask: `url(${iconPaths[name]}) center / contain no-repeat`,
      }}
    />
  );
}
