import FeatureGate from "@lufa/institutional-web/components/FeatureGate";
import { showRankingsPages } from "@/flags";

export default function RankingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <FeatureGate isEnabled={showRankingsPages} pageName="rankings">
      {children}
    </FeatureGate>
  );
}
