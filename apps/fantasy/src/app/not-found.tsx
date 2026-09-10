import Link from "next/link";

export default function NotFound() {
  return (
    <main className="error-page">
      <section>
        <span className="eyebrow">404</span>
        <h1>Esta jugada no existe.</h1>
        <p>La página que buscás cambió de lugar o salió de la cancha.</p>
        <Link className="button button-primary" href="/">Volver al inicio</Link>
      </section>
    </main>
  );
}
