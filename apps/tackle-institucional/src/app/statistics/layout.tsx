import FeatureGate from "@lufa/institutional-web/components/FeatureGate";
import { showStatisticsPages } from "@/flags";

export default function StatisticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <FeatureGate isEnabled={showStatisticsPages} pageName="estadísticas">
      {children}
    </FeatureGate>
  );
}
