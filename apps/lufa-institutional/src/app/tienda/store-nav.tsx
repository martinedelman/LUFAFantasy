"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export function StoreNav() {
  const [signedIn, setSignedIn] = useState(false);
  const [canSell, setCanSell] = useState(false);
  useEffect(() => {
    let active = true;
    void fetch("/api/auth/me", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return null;
      const body = await response.json() as { data?: { role?: string } };
      return body.data ?? null;
    }).then(async (user) => {
      if (!active || !user) return;
      setSignedIn(true);
      const response = await fetch("/api/commerce/seller/profile", { cache: "no-store" });
      if (!active || !response.ok) return;
      const body = await response.json() as { data?: unknown[] };
      setCanSell(Array.isArray(body.data) && body.data.length > 0);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  return <nav aria-label="Navegación principal"><Link href="/">Inicio</Link><Link href="/#acerca">Acerca de LUFA</Link><Link href="/#proximos-partidos">Próximos partidos</Link><Link href="/tienda">Tienda</Link>{signedIn ? <Link href="/tienda/mis-compras">Mis compras</Link> : null}{canSell ? <Link href="/vender">Vendedores</Link> : null}</nav>;
}
