import { redirect } from "next/navigation";
import { flagAuthUrl } from "@/lib/centralAuth";

export default function ForgotPasswordPage() {
  redirect(flagAuthUrl("forgot-password"));
}
