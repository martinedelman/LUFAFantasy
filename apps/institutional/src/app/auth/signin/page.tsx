import { redirect } from "next/navigation";
import { flagAuthUrl } from "@/lib/centralAuth";

export default function SignInPage() {
  redirect(flagAuthUrl("login"));
}
