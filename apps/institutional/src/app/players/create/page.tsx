"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminProtection from "@/components/AdminProtection";
import ImageUploader from "@/components/ImageUploader";
import InlineFeedback from "@/components/InlineFeedback";
import LoadingSpinner from "@/components/LoadingSpinner";

interface Team {
  _id: string;
  name: string;
  shortName: string;
  division: {
    _id: string;
    name: string;
  };
}

export default function CreatePlayerPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    profilePicture: "",
    email: "",
    phone: "",
    dateOfBirth: "1900-01-01",
    team: "",
    jerseyNumber: "",
    position: "QB",
    secondaryPosition: "",
    height: "",
    weight: "",
    experience: "",
    emergencyContact: {
      name: "",
      relationship: "",
      phone: "",
      email: "",
    },
    registrationDate: new Date().toISOString().split("T")[0],
    status: "active",
  });
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(true);

  const validateField = (name: string, value: string) => {
    const trimmed = value.trim();

    if ((name === "firstName" || name === "lastName") && !trimmed) {
      return "Este campo es obligatorio.";
    }

    if ((name === "firstName" || name === "lastName") && trimmed.length < 2) {
      return "Debe tener al menos 2 caracteres.";
    }

    if ((name === "email" || name === "emergencyContact.email") && trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return "Ingresá un email válido.";
    }

    if (name === "team" && !trimmed) {
      return "Seleccioná un equipo.";
    }

    if ((name === "dateOfBirth" || name === "position") && !trimmed) {
      return "Este campo es obligatorio.";
    }

    if (name === "jerseyNumber") {
      const jerseyNumber = Number(value);
      if (!trimmed || !Number.isInteger(jerseyNumber) || jerseyNumber < 0 || jerseyNumber > 99) {
        return "Usá un número entre 0 y 99.";
      }
    }

    if (name === "height" && trimmed) {
      const height = Number(value);
      if (!Number.isFinite(height) || height < 120 || height > 230) {
        return "Ingresá una altura realista en cm.";
      }
    }

    if (name === "weight" && trimmed) {
      const weight = Number(value);
      if (!Number.isFinite(weight) || weight < 35 || weight > 220) {
        return "Ingresá un peso realista en kg.";
      }
    }

    return "";
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};
    [
      ["firstName", form.firstName],
      ["lastName", form.lastName],
      ["email", form.email],
      ["dateOfBirth", form.dateOfBirth],
      ["team", form.team],
      ["jerseyNumber", form.jerseyNumber],
      ["position", form.position],
      ["height", form.height],
      ["weight", form.weight],
      ["emergencyContact.email", form.emergencyContact.email],
    ].forEach(([name, value]) => {
      const message = validateField(name, value);
      if (message) nextErrors[name] = message;
    });

    return nextErrors;
  };

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await fetch("/api/teams?limit=100");
        const data = await res.json();
        if (data.success) {
          setTeams(data.data);
        }
      } catch (error) {
        console.error("Error loading teams:", error);
      } finally {
        setLoadingTeams(false);
      }
    };

    fetchTeams();
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

  const inputClassName = (fieldName: string) =>
    `w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
      fieldErrors[fieldName] ? "border-red-300 bg-red-50" : "border-gray-300"
    }`;

  const renderFieldError = (fieldName: string) =>
    fieldErrors[fieldName] ? (
      <span id={`${fieldName.replace(/\./g, "-")}-error`} className="mt-1 block text-xs font-medium text-red-600">
        {fieldErrors[fieldName]}
      </span>
    ) : null;

  const requiredLabel = (label: string) => (
    <>
      {label} <span className="text-red-600">*</span>
      <span className="ml-1 text-xs font-normal text-gray-500">Obligatorio</span>
    </>
  );

  const isFormReady = Object.keys(validateForm()).length === 0 && !loadingTeams;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextFieldErrors = validateForm();
    setFieldErrors(nextFieldErrors);

    if (Object.values(nextFieldErrors).some(Boolean)) {
      setError("Revisá los campos marcados antes de crear el jugador.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dateOfBirth: form.dateOfBirth,
        team: form.team,
        jerseyNumber: Number(form.jerseyNumber),
        position: form.position,
        status: form.status,
      };

      if (form.secondaryPosition) payload.secondaryPosition = form.secondaryPosition;
      if (form.email.trim()) payload.email = form.email.trim();
      if (form.phone.trim()) payload.phone = form.phone.trim();
      if (form.profilePicture.trim()) payload.profilePicture = form.profilePicture.trim();
      if (form.registrationDate) payload.registrationDate = form.registrationDate;
      if (form.height !== "") payload.height = Number(form.height);
      if (form.weight !== "") payload.weight = Number(form.weight);
      if (form.experience.trim()) payload.experience = form.experience.trim();

      const hasEmergencyContactData =
        form.emergencyContact.name.trim() ||
        form.emergencyContact.relationship.trim() ||
        form.emergencyContact.phone.trim() ||
        form.emergencyContact.email.trim();

      if (hasEmergencyContactData) {
        payload.emergencyContact = {
          ...(form.emergencyContact.name.trim() && { name: form.emergencyContact.name.trim() }),
          ...(form.emergencyContact.relationship.trim() && {
            relationship: form.emergencyContact.relationship.trim(),
          }),
          ...(form.emergencyContact.phone.trim() && { phone: form.emergencyContact.phone.trim() }),
          ...(form.emergencyContact.email.trim() && { email: form.emergencyContact.email.trim() }),
        };
      }

      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/players");
      } else {
        setError(data.message || "Error al crear jugador");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };
  return (
    <AdminProtection fallbackMessage="Solo los administradores pueden crear jugadores.">
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Crear Nuevo Jugador</h1>
              <p className="mt-2 text-gray-600">Complete la información del jugador</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Información Básica */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Información Personal</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <ImageUploader
                      label="Foto de Perfil"
                      assetType="player_profile_picture"
                      value={form.profilePicture}
                      onUploaded={(url) => setForm((prev) => ({ ...prev, profilePicture: url }))}
                      disabled={loading}
                      enableCrop
                    />
                    <input
                      name="profilePicture"
                      type="text"
                      value={form.profilePicture}
                      readOnly
                      className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-600"
                      placeholder="URL generada automáticamente"
                    />
                  </div>
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                      {requiredLabel("Nombre")}
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      value={form.firstName}
                      onChange={handleChange}
                      aria-invalid={Boolean(fieldErrors.firstName)}
                      aria-describedby={fieldErrors.firstName ? "firstName-error" : undefined}
                      className={inputClassName("firstName")}
                      required
                    />
                    {renderFieldError("firstName")}
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                      {requiredLabel("Apellido")}
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={form.lastName}
                      onChange={handleChange}
                      aria-invalid={Boolean(fieldErrors.lastName)}
                      aria-describedby={fieldErrors.lastName ? "lastName-error" : undefined}
                      className={inputClassName("lastName")}
                      required
                    />
                    {renderFieldError("lastName")}
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      aria-invalid={Boolean(fieldErrors.email)}
                      aria-describedby={fieldErrors.email ? "email-error" : undefined}
                      className={inputClassName("email")}
                    />
                    {renderFieldError("email")}
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
                      {requiredLabel("Fecha de Nacimiento")}
                    </label>
                    <input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                      value={form.dateOfBirth}
                      onChange={handleChange}
                      aria-invalid={Boolean(fieldErrors.dateOfBirth)}
                      aria-describedby={fieldErrors.dateOfBirth ? "dateOfBirth-error" : undefined}
                      className={inputClassName("dateOfBirth")}
                      required
                    />
                    {renderFieldError("dateOfBirth")}
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

              {/* Información Deportiva */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Información Deportiva</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="team" className="block text-sm font-medium text-gray-700 mb-1">
                      {requiredLabel("Equipo")}
                    </label>
                    <select
                      id="team"
                      name="team"
                      value={form.team}
                      onChange={handleChange}
                      aria-invalid={Boolean(fieldErrors.team)}
                      aria-describedby={fieldErrors.team ? "team-error" : undefined}
                      className={inputClassName("team")}
                      required
                      disabled={loadingTeams}
                    >
                      <option value="">Seleccionar equipo</option>
                      {teams.map((team) => (
                        <option key={team._id} value={team._id}>
                          {team.name} ({team.division.name})
                        </option>
                      ))}
                    </select>
                    {renderFieldError("team")}
                  </div>
                  <div>
                    <label htmlFor="jerseyNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      {requiredLabel("Número de Camiseta")}
                    </label>
                    <input
                      id="jerseyNumber"
                      name="jerseyNumber"
                      type="number"
                      min="0"
                      max="99"
                      value={form.jerseyNumber}
                      onChange={handleChange}
                      aria-invalid={Boolean(fieldErrors.jerseyNumber)}
                      aria-describedby={fieldErrors.jerseyNumber ? "jerseyNumber-error" : undefined}
                      className={inputClassName("jerseyNumber")}
                      required
                    />
                    {renderFieldError("jerseyNumber")}
                  </div>
                  <div>
                    <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
                      {requiredLabel("Posición")}
                    </label>
                    <select
                      id="position"
                      name="position"
                      value={form.position}
                      onChange={handleChange}
                      aria-invalid={Boolean(fieldErrors.position)}
                      aria-describedby={fieldErrors.position ? "position-error" : undefined}
                      className={inputClassName("position")}
                      required
                    >
                      <option value="QB">Quarterback (QB)</option>
                      <option value="WR">Wide Receiver (WR)</option>
                      <option value="RB">Running Back (RB)</option>
                      <option value="C">Center (C)</option>
                      <option value="RS">Rusher (RS)</option>
                      <option value="LB">Linebacker (LB)</option>
                      <option value="CB">Cornerback (CB)</option>
                      <option value="FS">Free Safety (FS)</option>
                      <option value="SS">Strong Safety (SS)</option>
                    </select>
                    {renderFieldError("position")}
                  </div>
                  <div>
                    <label htmlFor="secondaryPosition" className="block text-sm font-medium text-gray-700 mb-1">
                      Posición secundaria
                    </label>
                    <select
                      id="secondaryPosition"
                      name="secondaryPosition"
                      value={form.secondaryPosition}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Sin posición secundaria</option>
                      <option value="QB">Quarterback (QB)</option>
                      <option value="WR">Wide Receiver (WR)</option>
                      <option value="RB">Running Back (RB)</option>
                      <option value="C">Center (C)</option>
                      <option value="RS">Rusher (RS)</option>
                      <option value="LB">Linebacker (LB)</option>
                      <option value="CB">Cornerback (CB)</option>
                      <option value="FS">Free Safety (FS)</option>
                      <option value="SS">Strong Safety (SS)</option>
                    </select>
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
                      <option value="pre_approved">PRE-APROBADO</option>
                      <option value="inactive">Inactivo</option>
                      <option value="injured">Lesionado</option>
                      <option value="suspended">Suspendido</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-1">
                      Altura (cm)
                    </label>
                    <input
                      id="height"
                      name="height"
                      type="number"
                      min="150"
                      max="220"
                      value={form.height}
                      onChange={handleChange}
                      aria-invalid={Boolean(fieldErrors.height)}
                      aria-describedby={fieldErrors.height ? "height-error" : undefined}
                      className={inputClassName("height")}
                    />
                    {renderFieldError("height")}
                  </div>
                  <div>
                    <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
                      Peso (kg)
                    </label>
                    <input
                      id="weight"
                      name="weight"
                      type="number"
                      min="50"
                      max="200"
                      value={form.weight}
                      onChange={handleChange}
                      aria-invalid={Boolean(fieldErrors.weight)}
                      aria-describedby={fieldErrors.weight ? "weight-error" : undefined}
                      className={inputClassName("weight")}
                    />
                    {renderFieldError("weight")}
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-1">
                      Experiencia
                    </label>
                    <input
                      id="experience"
                      name="experience"
                      type="text"
                      value={form.experience}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ej: 3 años de experience en football americano"
                    />
                  </div>
                </div>
              </div>

              {/* Contacto de Emergencia */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Contacto de Emergencia</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="emergencyContact.name" className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Contacto
                    </label>
                    <input
                      id="emergencyContact.name"
                      name="emergencyContact.name"
                      type="text"
                      value={form.emergencyContact.name}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="emergencyContact.relationship"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Parentesco
                    </label>
                    <input
                      id="emergencyContact.relationship"
                      name="emergencyContact.relationship"
                      type="text"
                      value={form.emergencyContact.relationship}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ej: Padre, Madre, Hermano/a"
                    />
                  </div>
                  <div>
                    <label htmlFor="emergencyContact.phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono de Emergencia
                    </label>
                    <input
                      id="emergencyContact.phone"
                      name="emergencyContact.phone"
                      type="tel"
                      value={form.emergencyContact.phone}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="emergencyContact.email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email de Emergencia
                    </label>
                    <input
                      id="emergencyContact.email"
                      name="emergencyContact.email"
                      type="email"
                      value={form.emergencyContact.email}
                      onChange={handleChange}
                      aria-invalid={Boolean(fieldErrors["emergencyContact.email"])}
                      aria-describedby={fieldErrors["emergencyContact.email"] ? "emergencyContact-email-error" : undefined}
                      className={inputClassName("emergencyContact.email")}
                    />
                    {renderFieldError("emergencyContact.email")}
                  </div>
                </div>
              </div>

              {error && <InlineFeedback variant="error" title="No pudimos crear el jugador" message={error} />}

              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => router.push("/players")}
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  disabled={loading || !isFormReady}
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="sm" color="white" />
                      <span>Creando...</span>
                    </>
                  ) : (
                    "Crear Jugador"
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
