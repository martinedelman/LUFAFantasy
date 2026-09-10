import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
export const metadata: Metadata = { title: "Entrar" };
export default function SignInPage(){return <div className="auth-content"><span className="eyebrow">Qué bueno verte</span><h1>Volvé a la cancha.</h1><p>Entrá para seguir tus ligas, planteles y resultados.</p><AuthForm mode="signin"/><div className="form-footer">¿Todavía no tenés cuenta? <Link href="/auth/signup">Creala gratis</Link></div></div>}
