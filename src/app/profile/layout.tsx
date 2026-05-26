import FeatureGate from "@/components/FeatureGate";
import { showProfilePages } from "@/flags";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <FeatureGate isEnabled={showProfilePages} pageName="perfiles">
      {children}
    </FeatureGate>
  );
}
