"use client";

import { useState } from "react";
import { useOnboarding } from "./OnboardingProvider";

export function OnboardingControls() {
  const { restart, resume } = useOnboarding();
  const [pending, setPending] = useState(false);

  async function restartTutorial() {
    setPending(true);
    try { await restart(); }
    finally { setPending(false); }
  }

  return <section className="settings-card onboarding-settings-card">
    <span className="eyebrow">Guía para principiantes</span>
    <h2>Aprendé a jugar Fantasy</h2>
    <p>Una guía corta y opcional para conocer las ligas, el plantel, los jugadores y tu primer draft.</p>
    <div className="onboarding-settings-actions">
      <button className="button button-primary" type="button" onClick={resume} disabled={pending}>Reanudar tutorial</button>
      <button className="button button-ghost" type="button" onClick={() => void restartTutorial()} disabled={pending}>{pending ? "Reiniciando…" : "Reiniciar tutorial"}</button>
    </div>
  </section>;
}
