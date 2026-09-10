import FeatureGate from "@/components/FeatureGate";
import { showTournamentsPages } from "@/flags";

export default function TournamentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <FeatureGate isEnabled={showTournamentsPages} pageName="torneos">
      {children}
    </FeatureGate>
  );
}
