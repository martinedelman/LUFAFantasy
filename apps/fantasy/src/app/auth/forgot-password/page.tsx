import type { Metadata } from "next";
import Link from "next/link";
import { PasswordResetForm } from "@/components/PasswordResetForm";
export const metadata: Metadata = { title: "Recuperar contraseña" };
export default function ForgotPage(){return <div className="auth-content"><span className="eyebrow">Recuperar acceso</span><h1>Volvamos a empezar.</h1><p>Te enviamos un código para que puedas elegir una nueva contraseña.</p><PasswordResetForm/><div className="form-footer"><Link href="/auth/signin">Volver al ingreso</Link></div></div>}
