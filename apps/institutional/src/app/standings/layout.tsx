import FeatureGate from "@/components/FeatureGate";
import { showStandingsPages } from "@/flags";

export default function StandingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <FeatureGate isEnabled={showStandingsPages} pageName="posiciones">
      {children}
    </FeatureGate>
  );
}
