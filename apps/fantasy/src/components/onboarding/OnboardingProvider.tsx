"use client";

import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { fantasyRequest } from "@/lib/fantasyApi";
import { useSession } from "@/components/SessionProvider";

type Step = "welcome" | "league" | "navigation" | "players" | "favorite" | "team" | "draft";
type Status = "not_started" | "in_progress" | "completed" | "skipped";
interface OnboardingState { version: number; status: Status; currentStep: Step; startedAt: string | null; completedAt: string | null }
interface OnboardingValue { openHelp: () => void; restart: () => Promise<void>; resume: () => void; advanceFromAction: (action: "league" | "favorite" | "first_pick") => Promise<void> }

const OnboardingContext = createContext<OnboardingValue | null>(null);
const guidedSteps: Exclude<Step, "welcome">[] = ["league", "navigation", "players", "favorite", "team", "draft"];
const previousStep: Partial<Record<Step, Step>> = { navigation: "league", players: "navigation", favorite: "players", team: "favorite", draft: "team" };

const content: Record<Exclude<Step, "welcome">, { target: string; title: string; body: string; next?: { label: string; step: Step } }> = {
  league: { target: '[data-onboarding="league-actions"]', title: "Tu primera liga", body: "Para jugar necesitás una liga. Creá una para tu grupo o usá el código que te compartieron.", },
  navigation: { target: '[data-onboarding="league-nav"]', title: "Tus pestañas de juego", body: "Acá vas a moverte entre la liga, tu equipo, el draft y los jugadores. Entrá a Jugadores para seguir.", },
  players: { target: '[data-onboarding="players-filters"]', title: "Conocé a los jugadores", body: "Podés buscar por nombre, filtrar por posición y ver los puntos que hicieron esta temporada.", next: { label: "Ver favoritos", step: "favorite" } },
  favorite: { target: '[data-onboarding="favorite"]', title: "Guardá tus candidatos", body: "Tocá una estrella para guardar un favorito. Te sirve para preparar el draft sin perder de vista a quien te interesa.", },
  team: { target: '[data-onboarding="team-roster"]', title: "Este es tu plantel", body: "Tus titulares, defensa y suplentes se van a completar durante el draft. Cada posición tiene un lugar claro.", next: { label: "Entendí", step: "draft" } },
  draft: { target: '[data-onboarding="draft"]', title: "Tu primera elección", body: "En el draft los equipos eligen por turnos. Si todavía no empezó o está eligiendo otra persona, esperá: esta guía se completa cuando confirmes tu primer pick real.", },
};

function contextualStep(pathname: string): Step {
  if (pathname.endsWith("/players")) return "players";
  if (pathname.endsWith("/team")) return "team";
  if (pathname.includes("/leagues/")) return "draft";
  return "league";
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [contextStep, setContextStep] = useState<Step | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try { setState(await fantasyRequest<OnboardingState>("/onboarding")); } catch { setState(null); }
  }, [user]);
  useEffect(() => { if (!loading) void load(); }, [loading, load]);

  const save = useCallback(async (next: Partial<Pick<OnboardingState, "status" | "currentStep">>) => {
    const updated = await fantasyRequest<OnboardingState>("/onboarding", { method: "PATCH", body: JSON.stringify(next) });
    setState(updated);
    return updated;
  }, []);
  const advance = useCallback((step: Step) => { void save({ status: "in_progress", currentStep: step }).catch(() => undefined); }, [save]);

  useEffect(() => {
    if (state?.status === "in_progress" && state.currentStep === "navigation" && pathname.endsWith("/players")) advance("players");
  }, [advance, pathname, state?.currentStep, state?.status]);

  const visibleStep = contextStep || (state && (state.status === "not_started" || state.status === "in_progress") ? state.currentStep : null);
  useEffect(() => {
    if (!visibleStep || visibleStep === "welcome") { setTargetRect(null); return; }
    const update = () => {
      const target = document.querySelector(content[visibleStep].target);
      setTargetRect(target ? target.getBoundingClientRect() : null);
    };
    update(); window.addEventListener("resize", update); window.addEventListener("scroll", update, true);
    return () => { window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [visibleStep, pathname]);
  useEffect(() => {
    if (!visibleStep) return;
    dialogRef.current?.focus();
    const handleKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (contextStep) setContextStep(null);
        else void save({ status: "skipped", currentStep: visibleStep });
        return;
      }
      if (event.key !== "Tab") return;
      const buttons = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") || []);
      if (!buttons.length) return;
      const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const nextIndex = event.shiftKey ? (currentIndex <= 0 ? buttons.length - 1 : currentIndex - 1) : (currentIndex === buttons.length - 1 ? 0 : currentIndex + 1);
      event.preventDefault();
      buttons[nextIndex].focus();
    };
    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [contextStep, save, visibleStep]);

  const value = useMemo<OnboardingValue>(() => ({
    openHelp: () => setContextStep(contextualStep(pathname)),
    restart: async () => { const next = await fantasyRequest<OnboardingState>("/onboarding/restart", { method: "POST" }); setContextStep(null); setState(next); router.push("/app"); },
    resume: () => { setContextStep(null); if (state?.status === "skipped" || state?.status === "completed") void save({ status: "in_progress", currentStep: state.currentStep || "welcome" }).catch(() => undefined); },
    advanceFromAction: async (action) => {
      try {
        if (action === "league") await save({ status: "in_progress", currentStep: "navigation" });
        if (action === "favorite") await save({ status: "in_progress", currentStep: "team" });
        if (action === "first_pick") await save({ status: "completed", currentStep: "draft" });
      } catch {
        // The tutorial is optional: a progress write must never block gameplay.
      }
    },
  }), [pathname, router, save, state]);

  const dismiss = () => {
    if (contextStep) setContextStep(null);
    else void save({ status: "skipped" });
  };
  const isWelcome = visibleStep === "welcome";
  const activeContent = visibleStep && visibleStep !== "welcome" ? content[visibleStep] : null;

  return <OnboardingContext.Provider value={value}>{children}
    {visibleStep && <div className="onboarding-layer" aria-live="polite">
      {targetRect && <div className="onboarding-spotlight" style={{ top: targetRect.top - 6, left: targetRect.left - 6, width: targetRect.width + 12, height: targetRect.height + 12 }} />}
      <div className={`onboarding-card${isWelcome ? " welcome" : ""}`} ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <button className="onboarding-close" type="button" onClick={dismiss} aria-label="Cerrar tutorial">×</button>
        {isWelcome ? <><span className="eyebrow">Bienvenido a Fantasy Flag Uruguay</span><h2 id="onboarding-title">Tu equipo empieza con una decisión.</h2><p>Elegí jugadores, armá tu plantel y competí con tu gente. Te mostramos lo esencial en pocos pasos.</p><div className="onboarding-actions"><button className="button button-primary" type="button" onClick={() => advance("league")}>Empezar guía</button><button className="button button-ghost" type="button" onClick={dismiss}>Ahora no</button></div></> : <><span className="onboarding-progress">Paso {guidedSteps.indexOf(visibleStep) + 1} de 6</span><h2 id="onboarding-title">{activeContent?.title}</h2><p>{activeContent?.body}</p>{!targetRect && <small className="onboarding-wait">Navegá a la sección indicada para continuar.</small>}<div className="onboarding-actions">{!contextStep && previousStep[visibleStep] && <button className="button button-ghost" type="button" onClick={() => advance(previousStep[visibleStep]!) }>Atrás</button>}{activeContent?.next && <button className="button button-primary" type="button" onClick={() => advance(activeContent.next!.step)}>{activeContent.next.label}</button>}<button className="button button-ghost" type="button" onClick={dismiss}>{contextStep ? "Cerrar ayuda" : "Saltar tutorial"}</button></div></>}
      </div>
    </div>}
  </OnboardingContext.Provider>;
}

export function useOnboarding() {
  const value = useContext(OnboardingContext);
  if (!value) throw new Error("useOnboarding debe usarse dentro de OnboardingProvider");
  return value;
}
