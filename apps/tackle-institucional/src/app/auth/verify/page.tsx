import { redirect } from "next/navigation";
import LegacyVerifyPage from "@lufa/institutional-web/components/auth/LegacyVerifyPage";
import { legacyFlagAuthentication } from "@/flags";
import { getTackleAppUrl } from "@lufa/api-client/authUrls";
import { centralAuthDestination } from "@lufa/institutional-web/lib/centralAuth";

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
    redirect(centralAuthDestination("verify", params, getTackleAppUrl()).toString());
  }

  return <LegacyVerifyPage />;
}
