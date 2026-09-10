import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
export const metadata: Metadata = { title: "Crear cuenta" };
export default function SignUpPage(){return <div className="auth-content"><span className="eyebrow">Tu primera jugada</span><h1>Creá tu cuenta.</h1><p>Todo lo que necesitás para vivir el flag desde otro lugar.</p><AuthForm mode="signup"/><div className="form-footer">¿Ya tenés cuenta? <Link href="/auth/signin">Entrá acá</Link></div></div>}
