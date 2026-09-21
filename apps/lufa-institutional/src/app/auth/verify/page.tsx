import { Suspense } from "react";
import { CentralAuth } from "@/components/auth/CentralAuth";

export default function VerifyPage() {
  return <Suspense><CentralAuth mode="verify" /></Suspense>;
}
