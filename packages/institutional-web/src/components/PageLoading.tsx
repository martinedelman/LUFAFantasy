import Skeleton from "./Skeleton";

/**
 * Estado de carga de ruta: se muestra al instante al navegar mientras llega
 * el payload del servidor, antes de que la pantalla muestre su propio skeleton.
 */
export default function PageLoading() {
  return (
    <div className="min-h-screen bg-background" aria-busy="true" aria-label="Cargando">
      <div className="bg-brand-900 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-5">
          <Skeleton className="h-4 w-28 bg-white/25" />
          <Skeleton className="h-10 w-48 bg-white/25" />
          <div className="rounded-lg border border-white/25 bg-white/80 p-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-4 rounded-lg bg-white p-6 shadow-sm">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
