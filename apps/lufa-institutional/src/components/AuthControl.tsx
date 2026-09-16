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
      .then(async (response) => (response.ok ? ((await response.json()) as { data: User }) : null))
      .then((payload) => setUser(payload?.data ?? null))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  function signOut() {
    setUser(null);
    window.location.assign("/auth/logout");
  }

  if (checking) return <span className="session-loading" aria-label="Verificando sesión" />;
  if (user) {
    return (
      <div className="session-user">
        <Link className="profile-link" href="/mi-id" aria-label={`Abrir el perfil de ${user.name}`}>
          Mi perfil
        </Link>
        <button type="button" onClick={signOut}>
          Cerrar sesión
        </button>
      </div>
    );
  }

  return (
    <div className="session-user">
      <a className="sign-in-trigger" href="/auth/login">
        Iniciar sesión
      </a>
      <a className="sign-up-link" href="/auth/login?screen_hint=signup">
        Crear cuenta
      </a>
    </div>
  );
}
