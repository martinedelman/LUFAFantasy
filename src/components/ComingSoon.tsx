type ComingSoonProps = {
  pageName: string;
};

export default function ComingSoon({ pageName }: ComingSoonProps) {
  return (
    <section className="min-h-[calc(100dvh-70px)] bg-[rgb(248,250,252)] px-4 py-12 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100dvh-166px)] max-w-5xl items-center justify-center">
        <div className="w-full border-y border-slate-200 py-14 text-center sm:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-brand-800">LUFA Flag</p>
          <h1 className="mx-auto mt-5 max-w-4xl text-4xl font-bold leading-tight text-slate-950 sm:text-6xl lg:text-7xl">
            Próximamente vas a tener toda la información de los {pageName}.
          </h1>
        </div>
      </div>
    </section>
  );
}
