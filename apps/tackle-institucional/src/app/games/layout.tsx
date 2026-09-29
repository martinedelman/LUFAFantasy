import FeatureGate from "@lufa/institutional-web/components/FeatureGate";
import { showGamesPages } from "@/flags";

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return (
    <FeatureGate isEnabled={showGamesPages} pageName="partidos">
      {children}
    </FeatureGate>
  );
}
