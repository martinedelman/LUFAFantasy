type ComingSoonProps = {
  pageName: string;
};

export default function ComingSoon({ pageName }: ComingSoonProps) {
  const displayName = pageName.charAt(0).toUpperCase() + pageName.slice(1);

  return (
    <section className="relative min-h-[calc(100dvh-70px)] overflow-hidden bg-[linear-gradient(135deg,#eef7fd_0%,#f8fafc_46%,#fff7e6_100%)] px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <div className="coming-soon-grid absolute inset-0 opacity-55" aria-hidden="true" />

      <div className="relative mx-auto grid min-h-[calc(100dvh-150px)] max-w-7xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_520px]">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-3 rounded-full border border-amber-300 bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-950 shadow-sm">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
            </span>
            Sección en construcción
          </div>

          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.32em] text-brand-800">LUFA Flag</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight text-slate-950 sm:text-6xl lg:text-7xl">
            Próximamente vas a tener toda la información de los {pageName}.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
            Esta pantalla ya está en obra: estamos preparando todo el contenido para que disfrutes el flag de la mejor
            manera posible.
          </p>
        </div>

        <div className="relative min-h-[460px]">
          <div className="absolute inset-x-8 top-0 h-16 rounded-t-lg border border-b-0 border-slate-300 bg-[repeating-linear-gradient(135deg,#f59e0b_0_18px,#111827_18px_36px)] shadow-lg" />
          <div className="absolute inset-x-0 top-14 overflow-hidden rounded-lg border border-slate-300 bg-white/86 shadow-2xl shadow-sky-900/15 backdrop-blur">
            <div className="border-b border-slate-200 bg-slate-950 px-5 py-4 text-white">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-200">{displayName}</p>
              </div>
            </div>

            <div className="relative p-6 sm:p-8">
              <div className="coming-soon-scan absolute inset-x-6 top-8 h-1 rounded-full bg-brand-600/70" />

              <div className="space-y-4">
                <div className="h-7 w-2/3 rounded bg-slate-200" />
                <div className="h-4 w-full rounded bg-slate-100" />
                <div className="h-4 w-5/6 rounded bg-slate-100" />
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="coming-soon-tile h-28 rounded-lg border border-slate-200 bg-sky-50" />
                <div className="coming-soon-tile h-28 rounded-lg border border-slate-200 bg-emerald-50 delay-150" />
                <div className="coming-soon-tile h-28 rounded-lg border border-slate-200 bg-amber-50 delay-300" />
                <div className="coming-soon-tile h-28 rounded-lg border border-slate-200 bg-white" />
              </div>

              <div className="mt-8 overflow-hidden rounded-full bg-slate-200">
                <div className="coming-soon-bar h-4 w-3/4 rounded-full" />
              </div>

              <div className="mt-8 flex items-center gap-3 rounded-lg border border-dashed border-brand-700 bg-brand-100/70 px-4 py-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-xl font-black text-brand-900 shadow-sm">
                  !
                </span>
                <div>
                  <p className="font-bold text-slate-950">Acceso pausado por ahora</p>
                  <p className="text-sm text-slate-600">La feature flag decide cuándo se abre esta sección.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
