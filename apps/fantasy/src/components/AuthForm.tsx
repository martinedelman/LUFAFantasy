"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { fantasyRequest, type FantasyUser } from "@/lib/fantasyApi";

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      await fantasyRequest<FantasyUser>(mode === "signup" ? "/auth/register" : "/auth/login", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      router.push("/app");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos continuar");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      {mode === "signup" ? <div className="field"><label htmlFor="name">Tu nombre</label><input id="name" name="name" autoComplete="name" placeholder="¿Cómo te llamamos?" minLength={2} required /></div> : null}
      <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" placeholder="vos@email.com" required /></div>
      <div className="field">
        <div className="field-row"><label htmlFor="password">Contraseña</label>{mode === "signin" ? <Link className="form-link" href="/auth/forgot-password">¿La olvidaste?</Link> : null}</div>
        <input id="password" name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder="••••••••" minLength={8} required />
        {mode === "signup" ? <span className="field-hint">Mínimo 8 caracteres, con letras y números.</span> : null}
      </div>
      {error ? <div className="form-message" role="alert">{error}</div> : null}
      <button className="button button-primary button-large button-block" disabled={pending} type="submit">{pending ? "Un momento…" : mode === "signup" ? "Crear mi cuenta" : "Entrar a mi cuenta"}</button>
    </form>
  );
}
