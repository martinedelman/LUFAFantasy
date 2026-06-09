"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminProtection from "@/components/AdminProtection";
import ImageUploader from "@/components/ImageUploader";
import InlineFeedback from "@/components/InlineFeedback";
import LoadingSpinner from "@/components/LoadingSpinner";

interface Division {
  _id: string;
  name: string;
  category: string;
  tournament: {
    _id: string;
    name: string;
  };
}

export default function CreateTeamPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    shortName: "",
    logo: "",
    backgroundImage: "",
    division: "",
    colors: {
      primary: "#000000",
      secondary: "#FFFFFF",
    },
    contact: {
      email: "",
      phone: "",
      address: "",
    },
    coaches: [
      {
        name: "",
        email: "",
        phone: "",
        experience: "",
      },
      {
        name: "",
        email: "",
        phone: "",
        experience: "",
      },
    ],
    registrationDate: new Date().toISOString().split("T")[0],
    status: "active",
  });
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingDivisions, setLoadingDivisions] = useState(true);

  const validateField = (name: string, value: string) => {
    const trimmed = value.trim();

    if (name === "name" && trimmed && trimmed.length < 3) {
      return "El nombre del equipo debe tener al menos 3 caracteres.";
    }

    if (name === "shortName" && trimmed.length > 12) {
      return "Usá 12 caracteres o menos para que entre bien en las cards.";
    }

    if (name === "division" && !trimmed) {
      return "Seleccioná una división.";
    }

    if ((name === "contact.email" || name.includes(".email")) && trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return "Ingresá un email válido.";
    }

    return "";
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};
    [
      ["name", form.name],
      ["shortName", form.shortName],
      ["division", form.division],
      ["contact.email", form.contact.email],
      ["coaches.0.email", form.coaches[0].email],
      ["coaches.1.email", form.coaches[1].email],
    ].forEach(([name, value]) => {
      const message = validateField(name, value);
      if (message) nextErrors[name] = message;
    });

    return nextErrors;
  };

  useEffect(() => {
    const fetchDivisions = async () => {
      try {
        const res = await fetch("/api/divisions?limit=10");
        const data = await res.json();
        if (data.success) {
          setDivisions(data.data);
        }
      } catch (error) {
        console.error("Error loading divisions:", error);
      } finally {
        setLoadingDivisions(false);
      }
    };
    fetchDivisions();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setForm((prev) => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as Record<string, unknown>),
          [child]: value,
        },
      }));
    } else {
      setForm({ ...form, [name]: value });
    }
    setFieldErrors((prev) => ({
      ...prev,
      [name]: validateField(name, value),
    }));
    if (error) setError("");
  };

  const handleCoachChange = (index: number, field: "name" | "email" | "phone" | "experience", value: string) => {
    const fieldName = `coaches.${index}.${field}`;
    setForm((prev) => ({
      ...prev,
      coaches: prev.coaches.map((coach, coachIndex) => (coachIndex === index ? { ...coach, [field]: value } : coach)),
    }));
    setFieldErrors((prev) => ({
      ...prev,
      [fieldName]: validateField(fieldName, value),
    }));
    if (error) setError("");
  };

  const inputClassName = (fieldName: string) =>
    `w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
      fieldErrors[fieldName] ? "border-red-300 bg-red-50" : "border-gray-300"
    }`;

  const renderFieldError = (fieldName: string, title = "Revisá este campo") =>
    fieldErrors[fieldName] ? (
      <InlineFeedback
        compact
        className="mt-2"
        variant="error"
        title={title}
        message={<span id={`${fieldName.replace(/\./g, "-")}-error`}>{fieldErrors[fieldName]}</span>}
      />
    ) : null;

  const toNullable = (value: string) => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextFieldErrors = validateForm();
    setFieldErrors(nextFieldErrors);

    if (Object.values(nextFieldErrors).some(Boolean)) {
      setError("Revisá los campos marcados antes de crear el equipo.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          coaches: form.coaches
            .map((coach) => ({
              name: coach.name.trim(),
              email: toNullable(coach.email),
              phone: toNullable(coach.phone),
              experience: toNullable(coach.experience),
            }))
            .filter((coach) => coach.name),
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/teams");
      } else {
        setError(data.message || "Error al crear equipo");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminProtection fallbackMessage="Solo los administradores pueden crear equipos.">
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Crear Nuevo Equipo</h1>
              <p className="mt-2 text-gray-600">Complete la información del equipo</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Información Básica */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Información Básica</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Equipo *
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={form.name}
                      onChange={handleChange}
                      aria-invalid={Boolean(fieldErrors.name)}
                      aria-describedby={fieldErrors.name ? "name-error" : undefined}
                      className={inputClassName("name")}
                      required
                    />
                    {renderFieldError("name", "Nombre incompleto")}
                  </div>
                  <div>
                    <label htmlFor="shortName" className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre Corto
                    </label>
                    <input
                      id="shortName"
                      name="shortName"
                      type="text"
                      value={form.shortName}
                      onChange={handleChange}
                      aria-invalid={Boolean(fieldErrors.shortName)}
                      aria-describedby={fieldErrors.shortName ? "shortName-error" : undefined}
                      className={inputClassName("shortName")}
                    />
                    {renderFieldError("shortName", "Nombre corto largo")}
                  </div>
                  <div>
                    <label htmlFor="division" className="block text-sm font-medium text-gray-700 mb-1">
                      División *
                    </label>
                    <select
                      id="division"
                      name="division"
                      value={form.division}
                      onChange={handleChange}
                      aria-invalid={Boolean(fieldErrors.division)}
                      aria-describedby={fieldErrors.division ? "division-error" : undefined}
                      className={inputClassName("division")}
                      required
                      disabled={loadingDivisions}
                    >
                      <option value="">Seleccionar división</option>
                      {divisions.map((division) => (
                        <option key={division._id} value={division._id}>
                          {division.name}
                        </option>
                      ))}
                    </select>
                    {renderFieldError("division", "División requerida")}
                  </div>
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                      Estado
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                      <option value="suspended">Suspendido</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Colores */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Colores del Equipo</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="colors.primary" className="block text-sm font-medium text-gray-700 mb-1">
                      Color Primario *
                    </label>
                    <input
                      id="colors.primary"
                      name="colors.primary"
                      type="color"
                      value={form.colors.primary}
                      onChange={handleChange}
                      className="w-full h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="colors.secondary" className="block text-sm font-medium text-gray-700 mb-1">
                      Color Secundario
                    </label>
                    <input
                      id="colors.secondary"
                      name="colors.secondary"
                      type="color"
                      value={form.colors.secondary}
                      onChange={handleChange}
                      className="w-full h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Información de Contacto */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Información de Contacto</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact.email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email de Contacto
                    </label>
                    <input
                      id="contact.email"
                      name="contact.email"
                      type="email"
                      value={form.contact.email}
                      onChange={handleChange}
                      aria-invalid={Boolean(fieldErrors["contact.email"])}
                      aria-describedby={fieldErrors["contact.email"] ? "contact-email-error" : undefined}
                      className={inputClassName("contact.email")}
                    />
                    {renderFieldError("contact.email", "Email inválido")}
                  </div>
                  <div>
                    <label htmlFor="contact.phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono de Contacto
                    </label>
                    <input
                      id="contact.phone"
                      name="contact.phone"
                      type="tel"
                      value={form.contact.phone}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="contact.address" className="block text-sm font-medium text-gray-700 mb-1">
                      Dirección
                    </label>
                    <textarea
                      id="contact.address"
                      name="contact.address"
                      rows={3}
                      value={form.contact.address}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Información de Entrenadores */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Entrenadores (hasta 2)</h2>
                <div className="grid grid-cols-1 gap-6">
                  {[0, 1].map((coachIndex) => (
                    <div
                      key={coachIndex}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-md border border-gray-200 p-4"
                    >
                      <div className="md:col-span-2 text-sm font-medium text-gray-700">Entrenador {coachIndex + 1}</div>
                      <div>
                        <label
                          htmlFor={`coaches.${coachIndex}.name`}
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Nombre del Entrenador
                        </label>
                        <input
                          id={`coaches.${coachIndex}.name`}
                          type="text"
                          value={form.coaches[coachIndex].name}
                          onChange={(event) => handleCoachChange(coachIndex, "name", event.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`coaches.${coachIndex}.email`}
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Email del Entrenador
                        </label>
                        <input
                          id={`coaches.${coachIndex}.email`}
                          type="email"
                          value={form.coaches[coachIndex].email}
                          onChange={(event) => handleCoachChange(coachIndex, "email", event.target.value)}
                          aria-invalid={Boolean(fieldErrors[`coaches.${coachIndex}.email`])}
                          aria-describedby={
                            fieldErrors[`coaches.${coachIndex}.email`]
                              ? `coaches-${coachIndex}-email-error`
                              : undefined
                          }
                          className={inputClassName(`coaches.${coachIndex}.email`)}
                        />
                        {renderFieldError(`coaches.${coachIndex}.email`, "Email inválido")}
                      </div>
                      <div>
                        <label
                          htmlFor={`coaches.${coachIndex}.phone`}
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Teléfono del Entrenador
                        </label>
                        <input
                          id={`coaches.${coachIndex}.phone`}
                          type="tel"
                          value={form.coaches[coachIndex].phone}
                          onChange={(event) => handleCoachChange(coachIndex, "phone", event.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`coaches.${coachIndex}.experience`}
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Experiencia
                        </label>
                        <input
                          id={`coaches.${coachIndex}.experience`}
                          type="text"
                          value={form.coaches[coachIndex].experience}
                          onChange={(event) => handleCoachChange(coachIndex, "experience", event.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Ej: 5 años"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Otros */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Información Adicional</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <ImageUploader
                      label="Logo del Equipo"
                      assetType="team_logo"
                      value={form.logo}
                      onUploaded={(url) => setForm((prev) => ({ ...prev, logo: url }))}
                      disabled={loading}
                    />
                    <input
                      id="logo"
                      name="logo"
                      type="text"
                      value={form.logo}
                      readOnly
                      className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-600"
                      placeholder="URL generada automáticamente"
                    />
                  </div>
                  <div>
                    <ImageUploader
                      label="Imagen de Fondo del Equipo"
                      assetType="team_background"
                      value={form.backgroundImage}
                      onUploaded={(url) => setForm((prev) => ({ ...prev, backgroundImage: url }))}
                      disabled={loading}
                    />
                    <input
                      id="backgroundImage"
                      name="backgroundImage"
                      type="text"
                      value={form.backgroundImage}
                      readOnly
                      className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-600"
                      placeholder="URL generada automáticamente"
                    />
                  </div>
                  <div>
                    <label htmlFor="registrationDate" className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Registro
                    </label>
                    <input
                      id="registrationDate"
                      name="registrationDate"
                      type="date"
                      value={form.registrationDate}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {error && <InlineFeedback variant="error" title="No pudimos crear el equipo" message={error} />}

              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => router.push("/teams")}
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="sm" color="white" />
                      <span>Creando...</span>
                    </>
                  ) : (
                    "Crear Equipo"
                  )}
                </button>{" "}
              </div>
            </form>
          </div>
        </div>
      </div>
    </AdminProtection>
  );
}
