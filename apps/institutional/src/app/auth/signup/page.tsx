import { redirect } from "next/navigation";
import { flagAuthUrl } from "@/lib/centralAuth";

export default function SignUpPage() {
  redirect(flagAuthUrl("signup"));
}
