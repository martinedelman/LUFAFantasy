"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminProtection from "@/components/AdminProtection";

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
    coach: {
      name: "",
      email: "",
      phone: "",
      experience: "",
    },
    registrationDate: new Date().toISOString().split("T")[0],
    status: "active",
  });
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingDivisions, setLoadingDivisions] = useState(true);

  useEffect(() => {
    const fetchDivisions = async () => {
      try {
        const res = await fetch("/api/divisions?limit=100");
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
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
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
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
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      disabled={loadingDivisions}
                    >
                      <option value="">Seleccionar división</option>
                      {divisions.map((division) => (
                        <option key={division._id} value={division._id}>
                          {division.name} - {division.category} ({division.tournament.name})
                        </option>
                      ))}
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
                    <label
                      htmlFor="colors.secondary"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
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
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
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

              {/* Información del Entrenador */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Información del Entrenador</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="coach.name" className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Entrenador
                    </label>
                    <input
                      id="coach.name"
                      name="coach.name"
                      type="text"
                      value={form.coach.name}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="coach.email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email del Entrenador
                    </label>
                    <input
                      id="coach.email"
                      name="coach.email"
                      type="email"
                      value={form.coach.email}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="coach.phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono del Entrenador
                    </label>
                    <input
                      id="coach.phone"
                      name="coach.phone"
                      type="tel"
                      value={form.coach.phone}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="coach.experience"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Experiencia
                    </label>
                    <input
                      id="coach.experience"
                      name="coach.experience"
                      type="text"
                      value={form.coach.experience}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ej: 5 años"
                    />
                  </div>
                </div>
              </div>

              {/* Otros */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Información Adicional</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="logo" className="block text-sm font-medium text-gray-700 mb-1">
                      URL del Logo
                    </label>
                    <input
                      id="logo"
                      name="logo"
                      type="url"
                      value={form.logo}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="registrationDate"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
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
                  onClick={() => router.push("/teams")}
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? "Creando..." : "Crear Equipo"}
                </button>{" "}
              </div>
            </form>
          </div>
        </div>
      </div>
    </AdminProtection>
  );
}
