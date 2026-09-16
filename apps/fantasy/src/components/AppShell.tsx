"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";
import { Brand } from "./Brand";
import { LogOutIcon } from "./icons";
import { fantasyRequest } from "@/lib/fantasyApi";
import { useSession } from "./SessionProvider";
import { useOnboarding } from "./onboarding/OnboardingProvider";

interface LeagueNavigationItem {
  id: string;
  name: string;
  teamName: string;
}

function currentLeagueId(pathname: string) {
  return pathname.match(/^\/app\/leagues\/([^/]+)/)?.[1] || null;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useSession();
  const { openHelp } = useOnboarding();
  const [leagues, setLeagues] = useState<LeagueNavigationItem[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!loading && !user) router.replace("/auth/signin"); }, [loading, user, router]);
  useEffect(() => {
    if (!user) return;
    void fantasyRequest<LeagueNavigationItem[]>("/leagues").then(setLeagues).catch(() => setLeagues([]));
  }, [user]);
  useEffect(() => {
    if (!profileOpen) return;
    function closeOnOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setProfileOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setProfileOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("mousedown", closeOnOutside); document.removeEventListener("keydown", closeOnEscape); };
  }, [profileOpen]);

  const activeLeagueId = currentLeagueId(pathname) || leagues[0]?.id || "";

  async function logout() {
    await fetch("/api/fantasy/v1/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  if (loading || !user) return <div className="shell-loading" aria-label="Cargando"><span className="loading-mark"><i /><i /><i /></span></div>;
  const initials = user.name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const leagueLink = (hash: string) => activeLeagueId ? `/app/leagues/${activeLeagueId}${hash}` : "/app/leagues";
  const leagueLinks = [
    { href: leagueLink("#overview"), label: "Liga", active: Boolean(activeLeagueId && pathname === `/app/leagues/${activeLeagueId}`) },
    { href: activeLeagueId ? `/app/leagues/${activeLeagueId}/team` : "/app/leagues", label: "Mi equipo", active: pathname.endsWith("/team") },
    { href: leagueLink("#draft"), label: "Draft", active: false },
    { href: activeLeagueId ? `/app/leagues/${activeLeagueId}/players` : "/app/leagues", label: "Jugadores", active: pathname.endsWith("/players") },
    { href: "/app/leagues", label: "Mis ligas", active: pathname === "/app/leagues" },
  ];

  return <div className="product-layout">
    <header className="product-topbar">
      <div className="topbar-brand"><Brand compact href="/app" /></div>
      <div className="league-selector"><label htmlFor="active-league">Liga activa</label><select id="active-league" value={activeLeagueId} disabled={!leagues.length} onChange={(event) => router.push(`/app/leagues/${event.target.value}`)}>{!leagues.length && <option value="">Sin liga seleccionada</option>}{leagues.map((league) => <option key={league.id} value={league.id}>{league.name} · {league.teamName}</option>)}</select></div>
      <nav className="league-nav" data-onboarding="league-nav" aria-label="Navegación de liga">{leagueLinks.map((link) => <Link key={link.label} href={link.href} className={`league-nav-link${link.active ? " active" : ""}`}>{link.label}</Link>)}</nav>
      <div className="topbar-user" ref={profileRef}>
        <button className="topbar-avatar" type="button" onClick={() => setProfileOpen((open) => !open)} aria-label="Abrir menú de perfil" aria-expanded={profileOpen}>{initials}</button>
        {profileOpen && <div className="profile-menu" role="menu">
          <div className="profile-menu-header"><strong>{user.name}</strong><span>{user.email}</span></div>
          <Link href="/app/profile" role="menuitem" onClick={() => setProfileOpen(false)}>Mi perfil</Link>
          <button type="button" role="menuitem" onClick={() => { setProfileOpen(false); openHelp(); }}>Ayuda y tutorial</button>
          <button type="button" role="menuitem" className="profile-menu-signout" onClick={logout}><LogOutIcon /> Cerrar sesión</button>
        </div>}
      </div>
    </header>
    <main className="product-content">{children}</main>
  </div>;
}
