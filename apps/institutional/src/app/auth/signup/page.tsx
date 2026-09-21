import { redirect } from "next/navigation";
import LegacySignUpPage from "@/components/auth/LegacySignUpPage";
import { legacyFlagAuthentication } from "@/flags";
import { centralAuthDestination } from "@/lib/centralAuth";

type SignUpPageProps = {
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const [useLegacyAuthentication, params] = await Promise.all([
    legacyFlagAuthentication(),
    searchParams,
  ]);

  if (!useLegacyAuthentication) {
    redirect(centralAuthDestination("signup", params).toString());
  }

  return <LegacySignUpPage />;
}
