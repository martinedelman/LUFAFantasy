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

export default function GoogleIcon({ name, className = "" }: GoogleIconProps) {
  return (
    <span aria-hidden="true" className={`material-symbols-rounded inline-flex aspect-square items-center justify-center leading-none ${className}`}>
      {name}
    </span>
  );
}
