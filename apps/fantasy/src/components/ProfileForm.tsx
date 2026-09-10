"use client";

import { FormEvent, useState } from "react";
import { fantasyRequest, type FantasyUser } from "@/lib/fantasyApi";
import { useSession } from "./SessionProvider";

export function ProfileForm() {
  const { user, refresh } = useSession();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage(""); setError("");
    const form = new FormData(event.currentTarget);
    try {
      await fantasyRequest<FantasyUser>("/auth/me", { method: "PATCH", body: JSON.stringify({ name: form.get("name") }) });
      await refresh(); setMessage("Perfil actualizado.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No pudimos guardar"); }
    finally { setPending(false); }
  }
  return <form className="settings-card" onSubmit={submit}><h2>Datos personales</h2><p>Así vas a aparecer dentro de tus ligas.</p>{message ? <div className="form-message success">{message}</div> : null}{error ? <div className="form-message" role="alert">{error}</div> : null}<div className="form"><div className="field"><label htmlFor="profile-name">Nombre</label><input id="profile-name" name="name" defaultValue={user?.name} minLength={2} required /></div><div className="field"><label htmlFor="profile-email">Email</label><input id="profile-email" value={user?.email || ""} disabled /><span className="field-hint">El cambio de email todavía no está disponible.</span></div><button className="button button-primary button-large" disabled={pending}>{pending ? "Guardando…" : "Guardar cambios"}</button></div></form>;
}
