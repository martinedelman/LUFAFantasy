"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "./AuthControl.css";

type User = { id: string; name: string; email: string; role: string };

export function AuthControl() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    void fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => (response.ok ? (await response.json()) as { data: User } : null))
      .then((payload) => setUser(payload?.data ?? null))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setUser(null);
  }

  if (checking) return <span className="session-loading" aria-label="Verificando sesión" />;
  if (user) {
    return (
      <div className="session-user">
        <Link className="profile-link" href="/mi-id">Mi perfil</Link>
        <button type="button" onClick={signOut}>Cerrar sesión</button>
      </div>
    );
  }

  return (
    <div className="auth-links">
      <Link href="/auth/login">Iniciar sesión</Link>
      <Link href="/auth/signup" className="create-account">Crear cuenta</Link>
    </div>
  );
}
