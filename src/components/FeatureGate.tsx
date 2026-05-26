import ComingSoon from "@/components/ComingSoon";

type FeatureGateProps = {
  children: React.ReactNode;
  isEnabled: () => Promise<boolean>;
  pageName: string;
};

export default async function FeatureGate({ children, isEnabled, pageName }: FeatureGateProps) {
  return (await isEnabled()) ? <>{children}</> : <ComingSoon pageName={pageName} />;
}
