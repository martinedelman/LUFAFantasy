import { UpcomingGames } from "@/components/UpcomingGames";
import { AuthControl } from "@/components/AuthControl";
import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

const flagUrl = process.env.NEXT_PUBLIC_FLAG_URL || "https://flag.lufa.com.uy";

export default function HomePage() {
  return (
    <main className={`${styles.portal} page-shell`}>
      <header className={`header ${styles.header}`}>
        <Link className="brand" href="/" aria-label="Inicio LUFA">
          <Image src="/lufa_icon.png" alt="" width={78} height={78} priority />
          <span>Liga Uruguaya de Football Americano</span>
        </Link>
        <nav aria-label="Navegación principal">
          <Link href="#inicio">Inicio</Link>
          <Link href="#acerca">Acerca de LUFA</Link>
          <Link href="#proximos-partidos">Próximos partidos</Link>
          <a href={flagUrl}>Flag Football</a>
          <span aria-disabled="true">Tackle <small>Próximamente</small></span>
        </nav>
        <div className="header-session"><AuthControl /></div>
      </header>

      <section className={`hero ${styles.hero}`} id="inicio" aria-labelledby="portal-title">
        <Image
          className={styles.heroImage}
          src="/lufa-charruas-bears-team.jpg"
          alt="Plantel uruguayo de football americano"
          fill
          priority
          sizes="(max-width: 720px) 100vw, 94vw"
        />
        <div className={styles.heroShade} aria-hidden="true" />
        <div className="hero-panel">
          <p className="eyebrow">Liga Uruguaya de Football Americano</p>
          <h1 id="portal-title">
            Bienvenidos<br />a la LUFA
          </h1>
          <p>El espacio institucional para nuestras disciplinas.</p>
        </div>
      </section>

      <section className={`discipline-section ${styles.disciplines}`} aria-label="Disciplinas LUFA">
        <a className="discipline-card flag-card" href={flagUrl}>
          <span>01</span>
          <strong>Flag Football</strong>
          <small>Ver competencia y novedades</small>
          <i aria-hidden="true">↗</i>
        </a>
        <div className="discipline-card tackle-card" aria-disabled="true">
          <span>02</span>
          <strong>Tackle Football</strong>
          <small>Próximamente</small>
        </div>
      </section>

      <figure className={styles.communityPhoto}>
        <Image
          src="/lufa-charruas-huddle.jpg"
          alt="Jugadores de la selección uruguaya de football americano reunidos antes de un partido"
          fill
          sizes="(max-width: 720px) 100vw, 94vw"
        />
      </figure>

      <section className={`about-section ${styles.about}`} id="acerca" aria-labelledby="about-title">
        <div className={`about-image ${styles.aboutImage}`}>
          <Image
            src="/lufa-bears-charruas-community.jpg"
            alt="Comunidad del football americano uruguayo"
            fill
            sizes="(max-width: 720px) 100vw, 47vw"
          />
        </div>
        <div className="about-copy">
          <p className="eyebrow">Institucional</p>
          <h2 id="about-title">Acerca de LUFA</h2>
          <p>La Liga Uruguaya de Football Americano (LUFA) fue fundada en 1999, es una asociación civil sin fines de lucro, y es el ente rector del football americano en todo el territorio del Uruguay.</p>
          <p>Miembros de la <a href="http://www.americanfootball.sport/" target="_blank" rel="noreferrer">Federación Internacional de Football Americano</a> (IFAF) y de <a href="http://www.americanfootball.sport/member-federations/25" target="_blank" rel="noreferrer">IFAF Américas</a>, actualmente impulsa el crecimiento del deporte a través de sus modalidades de tackle y flag football.</p>
          <p>En particular, el flag football ha tenido un importante desarrollo en sus ramas masculina y femenina, y LUFA se encuentra además trabajando en el fortalecimiento de un proyecto de flag juvenil, con el objetivo de ampliar la base deportiva y seguir consolidando el crecimiento de la disciplina en el país.</p>
        </div>
      </section>

      <section className={`games-section ${styles.games}`} id="proximos-partidos" aria-labelledby="games-title">
        <div className="section-heading">
          <p className="eyebrow">Calendario</p>
          <h2 id="games-title">Próximos partidos</h2>
        </div>
        <UpcomingGames />
      </section>

      <footer className={styles.footer}>
        <Image src="/lufa_icon.png" alt="" width={44} height={44} />
        <span>LUFA · Liga Uruguaya de Football Americano</span>
      </footer>
    </main>
  );
}
