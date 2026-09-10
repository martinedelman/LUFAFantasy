"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { fantasyAction } from "@/lib/fantasyApi";

export function PasswordResetForm() {
  const [step, setStep] = useState<"request" | "confirm" | "done">("request");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage("");
    try {
      await fantasyAction("/auth/password-reset/request", { method: "POST", body: JSON.stringify({ email }) });
      setStep("confirm");
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : "No pudimos enviar el código"); }
    finally { setPending(false); }
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      await fantasyAction("/auth/password-reset/confirm", { method: "POST", body: JSON.stringify({ email, code: form.get("code"), password: form.get("password") }) });
      setStep("done");
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : "No pudimos actualizar la contraseña"); }
    finally { setPending(false); }
  }

  if (step === "done") return <div><div className="form-message success">Tu contraseña ya está actualizada.</div><Link className="button button-primary button-large button-block" href="/auth/signin">Volver a entrar</Link></div>;
  if (step === "confirm") return <form className="form" onSubmit={confirm}><div className="form-message success">Si existe una cuenta para {email}, enviamos un código de seis dígitos.</div><div className="field"><label htmlFor="code">Código</label><input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="000000" required /></div><div className="field"><label htmlFor="new-password">Nueva contraseña</label><input id="new-password" name="password" type="password" autoComplete="new-password" minLength={8} placeholder="••••••••" required /><span className="field-hint">Mínimo 8 caracteres, con letras y números.</span></div>{message ? <div className="form-message" role="alert">{message}</div> : null}<button className="button button-primary button-large button-block" disabled={pending}>{pending ? "Guardando…" : "Cambiar contraseña"}</button></form>;
  return <form className="form" onSubmit={requestCode}><div className="field"><label htmlFor="reset-email">Email de tu cuenta</label><input id="reset-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="vos@email.com" required /></div>{message ? <div className="form-message" role="alert">{message}</div> : null}<button className="button button-primary button-large button-block" disabled={pending}>{pending ? "Enviando…" : "Enviar código"}</button></form>;
}
