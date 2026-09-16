import { Suspense } from "react";
import { CentralAuth } from "@/components/auth/CentralAuth";

export default function LoginPage() {
  return <Suspense><CentralAuth mode="login" /></Suspense>;
}
