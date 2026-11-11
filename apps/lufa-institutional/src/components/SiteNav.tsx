"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthControl } from "./AuthControl";
import { StoreNavLinks } from "./StoreNavLinks";
import "./SiteNav.css";

type Props = { flagUrl: string; tackleUrl?: string; store?: boolean };

export function SiteNav({ flagUrl, tackleUrl, store = false }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    const media = window.matchMedia("(min-width: 761px)");
    const onResize = () => { if (media.matches) setOpen(false); };
    window.addEventListener("keydown", close);
    media.addEventListener("change", onResize);
    return () => { window.removeEventListener("keydown", close); media.removeEventListener("change", onResize); };
  }, [open]);

  const closeMenu = () => setOpen(false);

  return (
    <div className={`site-nav${open ? " site-nav-open" : ""}`}>
      <button
        className="site-nav-toggle"
        type="button"
        aria-expanded={open}
        aria-controls="site-nav-menu"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>
      <nav id="site-nav-menu" className="site-nav-menu" aria-label="Navegación principal">
        {store ? <>
          <Link href="/tienda" onClick={closeMenu}>Tienda</Link>
          <StoreNavLinks closeMenu={closeMenu} />
        </> : <>
          <Link href="#inicio" onClick={closeMenu}>Inicio</Link>
          <Link href="#acerca" onClick={closeMenu}>Acerca de LUFA</Link>
          <Link href="#proximos-partidos" onClick={closeMenu}>Próximos partidos</Link>
          <Link href="#sumate" onClick={closeMenu}>Sumate</Link>
          <Link href="/tienda" onClick={closeMenu}>Tienda</Link>
          <a href={flagUrl}>Flag Football</a>
          {tackleUrl ? <a href={tackleUrl}>Tackle Football</a> : null}
        </>}
        <div className="site-nav-session">
          <AuthControl />
        </div>
      </nav>
      {open ? <div className="site-nav-backdrop" role="presentation" onClick={closeMenu} /> : null}
    </div>
  );
}
