import { redirect } from "next/navigation";
import LegacySignUpPage from "@lufa/institutional-web/components/auth/LegacySignUpPage";
import { legacyFlagAuthentication } from "@/flags";
import { getTackleAppUrl } from "@lufa/api-client/authUrls";
import { centralAuthDestination } from "@lufa/institutional-web/lib/centralAuth";

type SignUpPageProps = {
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const [useLegacyAuthentication, params] = await Promise.all([
    legacyFlagAuthentication(),
    searchParams,
  ]);

  if (!useLegacyAuthentication) {
    redirect(centralAuthDestination("signup", params, getTackleAppUrl()).toString());
  }

  return <LegacySignUpPage />;
}
