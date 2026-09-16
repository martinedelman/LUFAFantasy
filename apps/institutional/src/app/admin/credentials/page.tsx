import { redirect } from "next/navigation";

export default function AdminCredentialsPage() {
  redirect("/admin?tab=credentials");
}
