import { Suspense } from "react";
import { CentralAuth } from "@/components/auth/CentralAuth";

export default function ForgotPasswordPage() {
  return <Suspense><CentralAuth mode="forgot-password" /></Suspense>;
}
