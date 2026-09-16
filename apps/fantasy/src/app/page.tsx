import Link from "next/link";
import { ArrowUpRightIcon, BoltIcon, FieldIcon, LiveIcon, SparkIcon } from "@/components/icons";
import { Brand } from "@/components/Brand";

export default function FantasyHome() {
  return (
    <div className="site-shell">
      <header className="public-header container">
        <Brand />
        <nav aria-label="Navegación principal">
          <Link className="text-link hide-mobile" href="#como-funciona">Cómo funciona</Link>
          <Link className="button button-ghost" href="/auth/signin">Entrar</Link>
          <Link className="button button-primary" href="/auth/signup">Crear cuenta</Link>
        </nav>
      </header>

      <main>
        <section className="hero-section container" aria-labelledby="fantasy-title">
          <div className="hero-copy">
            <div className="eyebrow"><span className="live-dot" /> Fantasy flag · Uruguay</div>
            <h1 id="fantasy-title">Tu lectura del juego, <em>en la cancha.</em></h1>
            <p>Elegí jugadores del flag uruguayo, armá tu equipo ideal y convertí cada fecha en una competencia con amigos.</p>
            <div className="hero-actions">
              <Link className="button button-primary button-large" href="/auth/signup">Empezar ahora <ArrowUpRightIcon /></Link>
              <Link className="button button-ghost button-large" href="#como-funciona">Ver cómo funciona</Link>
            </div>
            <div className="trust-row" aria-label="Beneficios">
              <span>Gratis para empezar</span><span>Hecho en Uruguay</span><span>Datos de cada fecha</span>
            </div>
          </div>

          <div className="hero-visual" aria-label="Vista previa del producto">
            <div className="visual-glow" />
            <div className="score-card glass-card">
              <div className="card-topline"><span>FECHA 04</span><span className="live-pill"><span /> EN VIVO</span></div>
              <div className="matchup-row">
                <div className="avatar avatar-lime">MV</div>
                <div><strong>Montevideo Vipers</strong><small>Tu equipo</small></div>
                <b>84.6</b>
              </div>
              <div className="matchup-row muted-row">
                <div className="avatar avatar-dark">CT</div>
                <div><strong>Costa Team</strong><small>Rival</small></div>
                <b>71.2</b>
              </div>
              <div className="progress-track"><span /></div>
              <div className="card-foot"><span>3 jugadores activos</span><span>+12.4 pts hoy</span></div>
            </div>
            <div className="event-card glass-card">
              <div className="event-icon"><BoltIcon /></div>
              <div><small>JUGADA RECIENTE</small><strong>Touchdown · +6 pts</strong><span>Sofía R. · WR</span></div>
            </div>
          </div>
        </section>

        <section className="how-section container" id="como-funciona" aria-labelledby="how-title">
          <div className="section-heading"><span className="eyebrow">Simple desde el kickoff</span><h2 id="how-title">Todo el juego.<br />Una liga propia.</h2></div>
          <div className="feature-grid">
            <article className="feature-card feature-card-wide"><span className="step">01</span><div className="feature-icon"><SparkIcon /></div><h3>Creá tu liga</h3><p>Invitá a tu grupo y definan quién sabe más de flag.</p><div className="invite-preview"><span>fantasy.uy/join/</span><b>MATE10</b><i>Copiar</i></div></article>
            <article className="feature-card"><span className="step">02</span><div className="feature-icon"><FieldIcon /></div><h3>Armá tu plantel</h3><p>Elegí talento del campeonato y construí un equipo a tu manera.</p><div className="player-stack"><span>SR</span><span>JL</span><span>MP</span><b>+5</b></div></article>
            <article className="feature-card"><span className="step">03</span><div className="feature-icon"><LiveIcon /></div><h3>Viví cada punto</h3><p>Seguí el rendimiento y la tabla mientras transcurre la fecha.</p><div className="mini-chart"><i /><i /><i /><i /><i /><i /><i /></div></article>
          </div>
        </section>

        <section className="closing-section container">
          <div><span className="eyebrow">La próxima fecha empieza hoy</span><h2>El flag se juega.<br /><em>Vos hacés el equipo.</em></h2></div>
          <Link className="button button-light button-large" href="/auth/signup">Crear mi cuenta <ArrowUpRightIcon /></Link>
        </section>
      </main>

      <footer className="public-footer container"><Brand /><p>Fantasy hecho para el flag de Uruguay.</p><span>© 2026</span></footer>
    </div>
  );
}
