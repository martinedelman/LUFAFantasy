import { redirect } from "next/navigation";
import LegacyVerifyPage from "@/components/auth/LegacyVerifyPage";
import { legacyFlagAuthentication } from "@/flags";
import { centralAuthDestination } from "@/lib/centralAuth";

type VerifyPageProps = {
  searchParams: Promise<{
    returnTo?: string | string[];
    token?: string | string[];
  }>;
};

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const [useLegacyAuthentication, params] = await Promise.all([
    legacyFlagAuthentication(),
    searchParams,
  ]);

  if (!useLegacyAuthentication) {
    redirect(centralAuthDestination("verify", params).toString());
  }

  return <LegacyVerifyPage />;
}
