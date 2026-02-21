"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminProtection from "@/components/AdminProtection";

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
    email: "",
    phone: "",
    dateOfBirth: "",
    team: "",
    jerseyNumber: "",
    position: "QB",
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
  const [loading, setLoading] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(true);

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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      if (form.email.trim()) payload.email = form.email.trim();
      if (form.phone.trim()) payload.phone = form.phone.trim();
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
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre *
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      value={form.firstName}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                      Apellido *
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={form.lastName}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
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
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
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
                      Fecha de Nacimiento *
                    </label>
                    <input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                      value={form.dateOfBirth}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
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

              {/* Información Deportiva */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Información Deportiva</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="team" className="block text-sm font-medium text-gray-700 mb-1">
                      Equipo *
                    </label>
                    <select
                      id="team"
                      name="team"
                      value={form.team}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  </div>
                  <div>
                    <label htmlFor="jerseyNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      Número de Camiseta *
                    </label>
                    <input
                      id="jerseyNumber"
                      name="jerseyNumber"
                      type="number"
                      min="1"
                      max="99"
                      value={form.jerseyNumber}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
                      Posición *
                    </label>
                    <select
                      id="position"
                      name="position"
                      value={form.position}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
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
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
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
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <div className="text-red-600 text-sm">{error}</div>
                  </div>
                </div>
              )}

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
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? "Creando..." : "Crear Jugador"}
                </button>{" "}
              </div>
            </form>
          </div>
        </div>
      </div>
    </AdminProtection>
  );
}
