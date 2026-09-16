import { redirect } from "next/navigation";
import { flagAuthUrl } from "@/lib/centralAuth";

type VerifyPageProps = { searchParams: Promise<{ token?: string }> };

export default async function VerifyRegistrationPage({ searchParams }: VerifyPageProps) {
  const { token } = await searchParams;
  const destination = new URL(flagAuthUrl("verify"));
  if (token) destination.searchParams.set("token", token);
  redirect(destination.toString());
}
