"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import "./AuthControl.css";

type User = { id: string; name: string; email: string; role: string };

export function AuthControl() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { void fetch("/api/auth/me", { cache: "no-store" }).then(async (response) => response.ok ? (await response.json()) as { data: User } : null).then((payload) => setUser(payload?.data ?? null)).catch(() => setUser(null)).finally(() => setChecking(false)); }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const payload = await response.json() as { success?: boolean; data?: User; message?: string };
      if (!response.ok || !payload.success || !payload.data) { setError(payload.message || "No pudimos iniciar sesión. Probá nuevamente."); return; }
      setUser(payload.data); setPassword(""); setOpen(false);
    } catch { setError("No pudimos conectar con el servicio de acceso. Probá nuevamente."); } finally { setSubmitting(false); }
  }

  async function signOut() { await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined); setUser(null); }

  if (checking) return <span className="session-loading" aria-label="Verificando sesión" />;
  if (user) return <div className="session-user"><Link className="profile-link" href="/mi-id" aria-label={`Abrir el perfil de ${user.name}`}>Mi perfil</Link><button type="button" onClick={signOut}>Cerrar sesión</button></div>;
  return <><button className="sign-in-trigger" type="button" onClick={() => setOpen(true)}>Iniciar sesión</button>{open ? <div className="login-backdrop" role="presentation" onMouseDown={() => setOpen(false)}><section className="login-dialog" role="dialog" aria-modal="true" aria-labelledby="login-title" onMouseDown={(event) => event.stopPropagation()}><button className="dialog-close" type="button" aria-label="Cerrar" onClick={() => setOpen(false)}>×</button><p className="eyebrow">Cuenta LUFA</p><h2 id="login-title">Iniciá sesión</h2><p>Usá tus credenciales de Flag LUFA.</p><form onSubmit={signIn}><label htmlFor="lufa-email">Email</label><input id="lufa-email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /><label htmlFor="lufa-password">Contraseña</label><input id="lufa-password" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />{error ? <p className="login-error" role="alert">{error}</p> : null}<button className="login-submit" type="submit" disabled={submitting}>{submitting ? "Ingresando…" : "Ingresar"}</button></form></section></div> : null}</>;
}
