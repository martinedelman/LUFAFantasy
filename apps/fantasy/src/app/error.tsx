"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="error-page">
      <section>
        <span className="eyebrow">Algo quedó fuera de juego</span>
        <h1>No pudimos cargar esta página</h1>
        <p>Probá nuevamente en unos segundos.</p>
        <button className="button button-primary" type="button" onClick={reset}>Intentar nuevamente</button>
      </section>
    </main>
  );
}
