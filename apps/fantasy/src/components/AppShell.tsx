"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { Brand } from "./Brand";
import { CloseIcon, GridIcon, LogOutIcon, MailIcon, MenuIcon, UserIcon, UsersIcon } from "./icons";
import { useSession } from "./SessionProvider";

const links = [
  { href: "/app", label: "Resumen", icon: GridIcon },
  { href: "/app/leagues", label: "Mis ligas", icon: UsersIcon },
  { href: "/app/invitations", label: "Invitaciones", icon: MailIcon },
  { href: "/app/profile", label: "Mi perfil", icon: UserIcon },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useSession();
  const [open, setOpen] = useState(false);

  useEffect(() => { if (!loading && !user) router.replace("/auth/signin"); }, [loading, user, router]);
  useEffect(() => { setOpen(false); }, [pathname]);

  async function logout() {
    await fetch("/api/fantasy/v1/auth/logout", { method: "POST" });
    router.replace("/"); router.refresh();
  }

  if (loading || !user) return <div className="shell-loading" aria-label="Cargando"><span className="loading-mark"><i /><i /><i /></span></div>;
  const initials = user.name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return <div className="product-layout">
    <aside className={`sidebar${open ? " open" : ""}`}>
      <Brand />
      <span className="nav-label">Tu fantasy</span>
      <nav className="side-nav" aria-label="Aplicación">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === "/app" ? pathname === href : pathname.startsWith(href);
          return <Link key={href} href={href} className={`side-link${active ? " active" : ""}`}><Icon />{label}</Link>;
        })}
      </nav>
      <div className="sidebar-footer"><div className="user-chip"><span className="user-avatar">{initials}</span><div className="user-meta"><strong>{user.name}</strong><span>{user.email}</span></div><button className="icon-button" type="button" onClick={logout} aria-label="Cerrar sesión"><LogOutIcon /></button></div></div>
    </aside>
    <div className="product-main">
      <header className="product-topbar"><button className="icon-button mobile-menu" type="button" onClick={() => setOpen((value) => !value)} aria-label={open ? "Cerrar menú" : "Abrir menú"}>{open ? <CloseIcon /> : <MenuIcon />}</button><span>Fantasy flag · Uruguay</span><span className="beta-badge">ACCESO ANTICIPADO</span></header>
      <main className="product-content">{children}</main>
    </div>
  </div>;
}
