import FeatureGate from "@/components/FeatureGate";
import { showTeamsPages } from "@/flags";

export default function TeamsLayout({ children }: { children: React.ReactNode }) {
  return (
    <FeatureGate isEnabled={showTeamsPages} pageName="equipos">
      {children}
    </FeatureGate>
  );
}
