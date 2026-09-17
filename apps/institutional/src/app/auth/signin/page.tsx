import { redirect } from "next/navigation";
import LegacySignInPage from "@/components/auth/LegacySignInPage";
import { legacyFlagAuthentication } from "@/flags";
import { centralAuthDestination } from "@/lib/centralAuth";

type SignInPageProps = {
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const [useLegacyAuthentication, params] = await Promise.all([
    legacyFlagAuthentication(),
    searchParams,
  ]);

  if (!useLegacyAuthentication) {
    redirect(centralAuthDestination("login", params).toString());
  }

  return <LegacySignInPage />;
}
