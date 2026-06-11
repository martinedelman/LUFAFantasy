"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { track } from "@vercel/analytics";
import GoogleIcon, { type GoogleIconName } from "@/components/GoogleIcon";

const officialWhatsAppChannelUrl = "https://whatsapp.com/channel/0029VbCnCzqKLaHqPlaOvV3W";

type FlagInterestType = "play" | "child" | "team" | "coach" | "referee" | "sponsor" | "school" | "other";

interface FlagInterestFormState {
  interestType: FlagInterestType | "";
  name: string;
  ageRange: string;
  location: string;
  whatsapp: string;
  experience: string;
  company: string;
  sponsorInterest: string;
}

const flagInterestOptions: Array<{ value: FlagInterestType; label: string; icon: GoogleIconName }> = [
  { value: "play", label: "Quiero jugar", icon: "sports_football" },
  { value: "child", label: "Quiero inscribir a mi hijo/a", icon: "child_care" },
  { value: "team", label: "Quiero crear un equipo", icon: "groups" },
  { value: "coach", label: "Quiero ser entrenador", icon: "strategy" },
  { value: "referee", label: "Quiero ser árbitro", icon: "sports_score" },
  { value: "sponsor", label: "Quiero sponsorear", icon: "handshake" },
  { value: "school", label: "Soy una institución educativa", icon: "school" },
  { value: "other", label: "Otro", icon: "campaign" },
];

const ageRangeOptions = ["Menor de 18", "18-24", "25-34", "35+"];

const locationOptions = [
  "Montevideo",
  "Canelones",
  "Maldonado",
  "Rocha",
  "Colonia",
  "San José",
  "Florida",
  "Lavalleja",
  "Treinta y Tres",
  "Cerro Largo",
  "Rivera",
  "Tacuarembó",
  "Durazno",
  "Flores",
  "Soriano",
  "Río Negro",
  "Paysandú",
  "Salto",
  "Artigas",
  "Otra ciudad",
];

const playerExperienceOptions = ["Nunca jugué", "Jugué recreativamente", "Competí", "Soy entrenador", "Otro"];

const sponsorInterestOptions = [
  "Patrocinio económico",
  "Activaciones de marca",
  "Equipamiento",
  "Eventos",
  "No estoy seguro",
];

const initialFlagInterestForm: FlagInterestFormState = {
  interestType: "",
  name: "",
  ageRange: "",
  location: "",
  whatsapp: "",
  experience: "",
  company: "",
  sponsorInterest: "",
};

export default function SumatePage() {
  const [flagInterestForm, setFlagInterestForm] = useState<FlagInterestFormState>(initialFlagInterestForm);
  const [flagInterestStep, setFlagInterestStep] = useState(0);
  const [flagInterestStatus, setFlagInterestStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [flagInterestError, setFlagInterestError] = useState<string | null>(null);

  const needsPlayerExperience = flagInterestForm.interestType === "play";
  const needsSponsorDetails = flagInterestForm.interestType === "sponsor";
  const flagInterestSteps = [
    "Participación",
    "Nombre",
    "Edad",
    "Ubicación",
    "WhatsApp",
    ...(needsPlayerExperience ? ["Experiencia"] : []),
    ...(needsSponsorDetails ? ["Sponsor"] : []),
  ];
  const currentFlagInterestStep = Math.min(flagInterestStep, flagInterestSteps.length - 1);
  const updateFlagInterestForm = <Key extends keyof FlagInterestFormState>(
    key: Key,
    value: FlagInterestFormState[Key],
  ) => {
    setFlagInterestForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "interestType" && value !== "play" ? { experience: "" } : {}),
      ...(key === "interestType" && value !== "sponsor" ? { company: "", sponsorInterest: "" } : {}),
    }));
    setFlagInterestStatus("idle");
    setFlagInterestError(null);
  };

  const isFlagInterestStepValid = () => {
    if (currentFlagInterestStep === 0) return Boolean(flagInterestForm.interestType);
    if (currentFlagInterestStep === 1) return flagInterestForm.name.trim().length >= 2;
    if (currentFlagInterestStep === 2) return Boolean(flagInterestForm.ageRange);
    if (currentFlagInterestStep === 3) return Boolean(flagInterestForm.location);
    if (currentFlagInterestStep === 4) return flagInterestForm.whatsapp.trim().replace(/\D/g, "").length >= 8;
    if (needsPlayerExperience) return Boolean(flagInterestForm.experience);
    if (needsSponsorDetails)
      return flagInterestForm.company.trim().length >= 2 && Boolean(flagInterestForm.sponsorInterest);
    return true;
  };

  const isFlagInterestFormComplete = () => {
    const baseComplete =
      Boolean(flagInterestForm.interestType) &&
      flagInterestForm.name.trim().length >= 2 &&
      Boolean(flagInterestForm.ageRange) &&
      Boolean(flagInterestForm.location) &&
      flagInterestForm.whatsapp.trim().replace(/\D/g, "").length >= 8;

    if (!baseComplete) return false;
    if (needsPlayerExperience) return Boolean(flagInterestForm.experience);
    if (needsSponsorDetails)
      return flagInterestForm.company.trim().length >= 2 && Boolean(flagInterestForm.sponsorInterest);
    return true;
  };

  const handleFlagInterestNext = () => {
    if (!isFlagInterestStepValid()) return;
    setFlagInterestStep((step) => Math.min(step + 1, flagInterestSteps.length - 1));
  };

  const handleFlagInterestBack = () => {
    setFlagInterestStep((step) => Math.max(step - 1, 0));
  };

  const handleFlagInterestSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isFlagInterestFormComplete()) {
      setFlagInterestStatus("error");
      setFlagInterestError("Completá los campos requeridos para enviar el formulario.");
      return;
    }

    setFlagInterestStatus("submitting");
    setFlagInterestError(null);

    try {
      const response = await fetch("/api/flag-interest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(flagInterestForm),
      });
      const payload = (await response.json()) as { success?: boolean; message?: string };

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "No pudimos enviar el formulario.");
      }

      track("Flag interest form submitted", {
        interestType: flagInterestForm.interestType,
        location: flagInterestForm.location,
      });
      setFlagInterestStatus("success");
    } catch (submitError) {
      setFlagInterestStatus("error");
      setFlagInterestError(submitError instanceof Error ? submitError.message : "No pudimos enviar el formulario.");
    }
  };

  const renderFlagInterestStep = () => {
    if (currentFlagInterestStep === 0) {
      return (
        <fieldset>
          <legend className="text-xl font-bold text-slate-950">¿Cómo querés participar?</legend>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {flagInterestOptions.map((option) => {
              const isSelected = flagInterestForm.interestType === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateFlagInterestForm("interestType", option.value)}
                  className={`flex min-h-[84px] items-center gap-4 rounded-lg border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
                    isSelected
                      ? "border-brand-700 bg-brand-100 text-brand-900 shadow-md"
                      : "border-slate-200 bg-white text-slate-800 hover:border-brand-500 hover:bg-slate-50"
                  }`}
                  aria-pressed={isSelected}
                >
                  <GoogleIcon name={option.icon} className="text-[32px] text-brand-900" />
                  <span className="min-w-0 text-sm font-bold leading-snug">{option.label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      );
    }

    if (currentFlagInterestStep === 1) {
      return (
        <div>
          <label htmlFor="flag-interest-name" className="text-xl font-bold text-slate-950">
            Nombre
          </label>
          <input
            id="flag-interest-name"
            type="text"
            value={flagInterestForm.name}
            onChange={(event) => updateFlagInterestForm("name", event.target.value)}
            placeholder={flagInterestForm.interestType === "child" ? "Nombre del adulto referente" : "Tu nombre"}
            className="mt-5 w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
            autoComplete="name"
          />
        </div>
      );
    }

    if (currentFlagInterestStep === 2) {
      return (
        <fieldset>
          <legend className="text-xl font-bold text-slate-950">Edad o rango etario</legend>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ageRangeOptions.map((range) => {
              const isSelected = flagInterestForm.ageRange === range;

              return (
                <button
                  key={range}
                  type="button"
                  onClick={() => updateFlagInterestForm("ageRange", range)}
                  className={`min-h-[56px] rounded-lg border px-4 py-3 text-center text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
                    isSelected
                      ? "border-brand-700 bg-brand-100 text-brand-900 shadow-md"
                      : "border-slate-200 bg-white text-slate-800 hover:border-brand-500 hover:bg-slate-50"
                  }`}
                  aria-pressed={isSelected}
                >
                  {range}
                </button>
              );
            })}
          </div>
        </fieldset>
      );
    }

    if (currentFlagInterestStep === 3) {
      return (
        <div>
          <label htmlFor="flag-interest-location" className="text-xl font-bold text-slate-950">
            Departamento o ciudad
          </label>
          <select
            id="flag-interest-location"
            value={flagInterestForm.location}
            onChange={(event) => updateFlagInterestForm("location", event.target.value)}
            className="mt-5 w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            <option value="">Seleccionar</option>
            {locationOptions.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (currentFlagInterestStep === 4) {
      return (
        <div>
          <label htmlFor="flag-interest-whatsapp" className="text-xl font-bold text-slate-950">
            WhatsApp
          </label>
          <input
            id="flag-interest-whatsapp"
            type="tel"
            inputMode="tel"
            value={flagInterestForm.whatsapp}
            onChange={(event) => updateFlagInterestForm("whatsapp", event.target.value)}
            placeholder="Ej: 099 123 456"
            className="mt-5 w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
            autoComplete="tel"
          />
        </div>
      );
    }

    if (needsPlayerExperience) {
      return (
        <fieldset>
          <legend className="text-xl font-bold text-slate-950">¿Tenés experiencia previa?</legend>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {playerExperienceOptions.map((experience) => {
              const isSelected = flagInterestForm.experience === experience;

              return (
                <button
                  key={experience}
                  type="button"
                  onClick={() => updateFlagInterestForm("experience", experience)}
                  className={`min-h-[56px] rounded-lg border px-4 py-3 text-left text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
                    isSelected
                      ? "border-brand-700 bg-brand-100 text-brand-900 shadow-md"
                      : "border-slate-200 bg-white text-slate-800 hover:border-brand-500 hover:bg-slate-50"
                  }`}
                  aria-pressed={isSelected}
                >
                  {experience}
                </button>
              );
            })}
          </div>
        </fieldset>
      );
    }

    return (
      <div className="space-y-5">
        <div>
          <label htmlFor="flag-interest-company" className="text-xl font-bold text-slate-950">
            Empresa
          </label>
          <input
            id="flag-interest-company"
            type="text"
            value={flagInterestForm.company}
            onChange={(event) => updateFlagInterestForm("company", event.target.value)}
            placeholder="Nombre de la empresa"
            className="mt-5 w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
            autoComplete="organization"
          />
        </div>
        <fieldset>
          <legend className="text-xl font-bold text-slate-950">¿Qué tipo de colaboración te interesa?</legend>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {sponsorInterestOptions.map((interest) => {
              const isSelected = flagInterestForm.sponsorInterest === interest;

              return (
                <button
                  key={interest}
                  type="button"
                  onClick={() => updateFlagInterestForm("sponsorInterest", interest)}
                  className={`min-h-[56px] rounded-lg border px-4 py-3 text-left text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
                    isSelected
                      ? "border-brand-700 bg-brand-100 text-brand-900 shadow-md"
                      : "border-slate-200 bg-white text-slate-800 hover:border-brand-500 hover:bg-slate-50"
                  }`}
                  aria-pressed={isSelected}
                >
                  {interest}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-[rgb(248,250,252)] text-slate-950">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-45"
          style={{ backgroundImage: "url(/Hero1.JPG)" }}
          aria-hidden="true"
        />
        <div className="relative mx-auto grid min-h-[360px] max-w-6xl items-end px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/80">LUFA Flag</p>
            <h1 className="mt-4 text-4xl font-black leading-tight sm:text-6xl">Sumate al Flag Football Uruguayo</h1>
            <p className="mt-5 text-lg font-medium leading-relaxed text-white/90 sm:text-xl">
              Completá este formulario en menos de 1 minuto y te contactaremos para ayudarte a empezar.
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8" aria-labelledby="sumate-title">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.35fr] lg:items-start">
          <div>
            <Link
              href="/"
              onClick={() => track("Flag interest back home clicked")}
              className="inline-flex min-h-[40px] items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800 transition hover:border-slate-500"
            >
              Volver al inicio
            </Link>
            <h2 id="sumate-title" className="mt-8 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
              Encontrá tu lugar en la comunidad
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-700">
              Jugá, entrená, arbitrá, creá un equipo o acercá tu marca al deporte olímpico que más crece en Uruguay.
            </p>
          </div>

          <form
            onSubmit={handleFlagInterestSubmit}
            className="rounded-xl border border-slate-200 bg-[rgb(248,250,252)] p-4 shadow-sm sm:p-6"
          >
            {flagInterestStatus === "success" ? (
              <div className="rounded-lg bg-white p-6 text-center">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-800">Formulario enviado</p>
                <h3 className="mt-3 text-3xl font-black text-slate-950">¡Bienvenido al Flag Football Uruguayo!</h3>
                <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-700">
                  En las próximas 24-48 horas un integrante de la organización se pondrá en contacto contigo para
                  ayudarte a dar el siguiente paso.
                </p>
                <a
                  href={officialWhatsAppChannelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track("Flag interest whatsapp channel clicked")}
                  className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-lg bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                >
                  Unirme al canal oficial de WhatsApp
                </a>
              </div>
            ) : (
              <>
                <div className="mb-6 flex flex-wrap items-center gap-2">
                  {flagInterestSteps.map((step, index) => (
                    <span
                      key={step}
                      className={`h-2 flex-1 rounded-full ${
                        index <= currentFlagInterestStep ? "bg-brand-700" : "bg-slate-200"
                      }`}
                      aria-label={`Paso ${index + 1}: ${step}`}
                    />
                  ))}
                </div>

                <div className="rounded-lg bg-white p-5 sm:p-6">
                  <p className="mb-4 text-sm font-bold text-brand-800">
                    Paso {currentFlagInterestStep + 1} de {flagInterestSteps.length}
                  </p>
                  {renderFlagInterestStep()}
                </div>

                {flagInterestStatus === "error" && flagInterestError ? (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                    {flagInterestError}
                  </div>
                ) : null}

                <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    onClick={handleFlagInterestBack}
                    disabled={currentFlagInterestStep === 0 || flagInterestStatus === "submitting"}
                    className="min-h-[48px] rounded-lg border border-slate-300 px-5 py-3 text-sm font-bold text-slate-800 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Atrás
                  </button>
                  {currentFlagInterestStep < flagInterestSteps.length - 1 ? (
                    <button
                      type="button"
                      onClick={handleFlagInterestNext}
                      disabled={!isFlagInterestStepValid()}
                      className="min-h-[48px] rounded-lg bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Siguiente
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!isFlagInterestFormComplete() || flagInterestStatus === "submitting"}
                      className="min-h-[48px] rounded-lg bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {flagInterestStatus === "submitting" ? "Enviando..." : "Enviar formulario"}
                    </button>
                  )}
                </div>
              </>
            )}
          </form>
        </div>
      </section>
    </main>
  );
}
