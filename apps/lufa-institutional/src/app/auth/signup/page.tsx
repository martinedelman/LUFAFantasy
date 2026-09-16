import { Suspense } from "react";
import { CentralAuth } from "@/components/auth/CentralAuth";

export default function SignupPage() {
  return <Suspense><CentralAuth mode="signup" /></Suspense>;
}
