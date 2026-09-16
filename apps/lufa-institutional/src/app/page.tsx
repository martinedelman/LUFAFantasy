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
          <Link href="#sumate">Sumate</Link>
          <a href={flagUrl}>Flag Football</a>
          <span aria-disabled="true">Tackle <small>Próximamente</small></span>
        </nav>
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
          <p>El football americano en Uruguay tiene lugar para vos: jugadores, clubes, instituciones y quienes quieran conocer el deporte.</p>
          <div className={styles.heroActions}>
            <a className={styles.primaryAction} href="#sumate">Quiero sumarme</a>
            <a className={styles.secondaryAction} href="#proximos-partidos">Ver próximos partidos</a>
          </div>
        </div>
      </section>

      <section className={`discipline-section ${styles.disciplines}`} aria-labelledby="disciplines-title">
        <div className={styles.disciplinesHeading}>
          <p className="eyebrow">Disciplinas</p>
          <h2 id="disciplines-title">Dos formas de jugar</h2>
          <p>Elegí la modalidad que va con vos. Ambas comparten la misma comunidad.</p>
        </div>
        <div className={styles.disciplineCards}>
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

      <section className={styles.join} id="sumate" aria-labelledby="join-title">
        <div className="section-heading">
          <p className="eyebrow">Sumate</p>
          <h2 id="join-title">¿Querés ser parte?</h2>
        </div>
        <div className={styles.joinCards}>
          <article className={styles.joinCard}>
            <p className="eyebrow">Jugadores y jugadoras</p>
            <h3>Empezá a jugar</h3>
            <p>No necesitás experiencia previa. Los equipos reciben nuevos integrantes durante toda la temporada y podés ir a ver un partido para conocer la comunidad.</p>
            <a href={flagUrl}>Conocer la competencia de Flag ↗</a>
          </article>
          <article className={styles.joinCard}>
            <p className="eyebrow">Clubes e instituciones</p>
            <h3>Traé el deporte a tu institución</h3>
            <p>Acompañamos a clubes, colegios y organizaciones que quieran formar un equipo, organizar clínicas o sumar el flag football a sus actividades.</p>
            <a href="#acerca">Conocer más sobre LUFA</a>
          </article>
          <article className={styles.joinCard}>
            <p className="eyebrow">Hinchas y familias</p>
            <h3>Vení a ver un partido</h3>
            <p>Los partidos son abiertos y con entrada libre. Encontrá la fecha, la modalidad y la dirección de cada encuentro en el calendario.</p>
            <a href="#proximos-partidos">Ver el calendario</a>
          </article>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <Image src="/lufa_icon.png" alt="" width={44} height={44} />
          <span>LUFA · Liga Uruguaya de Football Americano</span>
        </div>
        <div className={styles.footerAccess}>
          <span>¿Ya sos parte de LUFA?</span>
          <AuthControl />
        </div>
      </footer>
    </main>
  );
}
