import { redirect } from "next/navigation";
import LegacyForgotPasswordPage from "@lufa/institutional-web/components/auth/LegacyForgotPasswordPage";
import { legacyFlagAuthentication } from "@/flags";
import { centralAuthDestination } from "@lufa/institutional-web/lib/centralAuth";

type ForgotPasswordPageProps = {
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const [useLegacyAuthentication, params] = await Promise.all([
    legacyFlagAuthentication(),
    searchParams,
  ]);

  if (!useLegacyAuthentication) {
    redirect(centralAuthDestination("forgot-password", params).toString());
  }

  return <LegacyForgotPasswordPage />;
}
