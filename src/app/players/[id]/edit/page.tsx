"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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

export default function EditPlayerPage() {
  const router = useRouter();
  const params = useParams();
  const playerId = params?.id as string;
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
    registrationDate: "",
    status: "active",
  });
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch teams
        const teamsRes = await fetch("/api/teams?limit=100");
        const teamsData = await teamsRes.json();
        if (teamsData.success) {
          setTeams(teamsData.data);
        }

        // Fetch player data
        if (playerId) {
          const playerRes = await fetch(`/api/players/${playerId}`);
          const playerData = await playerRes.json();
          if (playerData.success) {
            const player = playerData.data;
            setForm({
              firstName: player.firstName || "",
              lastName: player.lastName || "",
              email: player.email || "",
              phone: player.phone || "",
              dateOfBirth: player.dateOfBirth ? new Date(player.dateOfBirth).toISOString().split("T")[0] : "",
              team: player.team?._id || "",
              jerseyNumber: player.jerseyNumber?.toString() || "",
              position: player.position || "QB",
              height: player.height?.toString() || "",
              weight: player.weight?.toString() || "",
              experience: player.experience || "",
              emergencyContact: {
                name: player.emergencyContact?.name || "",
                relationship: player.emergencyContact?.relationship || "",
                phone: player.emergencyContact?.phone || "",
                email: player.emergencyContact?.email || "",
              },
              registrationDate: player.registrationDate
                ? new Date(player.registrationDate).toISOString().split("T")[0]
                : "",
              status: player.status || "active",
            });
          } else {
            setError("No se pudo cargar el jugador");
          }
        }
      } catch {
        setError("Error de conexión");
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [playerId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      const res = await fetch(`/api/players/${playerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/players");
      } else {
        setError(data.message || "Error al editar jugador");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };
  if (loadingData) {
    return (
      <AdminProtection>
        <div className="min-h-screen flex items-center justify-center">Cargando jugador...</div>
      </AdminProtection>
    );
  }

  return (
    <AdminProtection fallbackMessage="Solo los administradores pueden editar jugadores.">
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-6">Editar Jugador</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <h2 className="text-xl font-semibold mb-4">Información Personal</h2>
            </div>
            <input
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              placeholder="Nombre"
              className="w-full border px-3 py-2 rounded"
              required
            />{" "}
            <input
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              placeholder="Apellido"
              className="w-full border px-3 py-2 rounded"
              required
            />
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email"
              className="w-full border px-3 py-2 rounded"
            />
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="Teléfono"
              className="w-full border px-3 py-2 rounded"
            />
            <input
              name="dateOfBirth"
              type="date"
              value={form.dateOfBirth}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              required
            />
            <input
              name="jerseyNumber"
              type="number"
              value={form.jerseyNumber}
              onChange={handleChange}
              placeholder="Número de camiseta"
              className="w-full border px-3 py-2 rounded"
              min="0"
              max="99"
              required
            />
            <div className="col-span-2">
              <h2 className="text-xl font-semibold mb-4 mt-6">Información Física</h2>
            </div>
            <input
              name="height"
              type="number"
              value={form.height}
              onChange={handleChange}
              placeholder="Altura (cm)"
              className="w-full border px-3 py-2 rounded"
              min="150"
              max="220"
            />
            <input
              name="weight"
              type="number"
              value={form.weight}
              onChange={handleChange}
              placeholder="Peso (kg)"
              className="w-full border px-3 py-2 rounded"
              min="50"
              max="200"
            />
            <div className="col-span-2">
              <input
                name="experience"
                value={form.experience}
                onChange={handleChange}
                placeholder="Experiencia"
                className="w-full border px-3 py-2 rounded"
              />
            </div>
            <div className="col-span-2">
              <h2 className="text-xl font-semibold mb-4 mt-6">Información Deportiva</h2>
            </div>
            <select
              name="position"
              value={form.position}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            >
              <option value="QB">QB</option>
              <option value="WR">WR</option>
              <option value="RB">RB</option>
              <option value="C">C</option>
              <option value="G">G</option>
              <option value="T">T</option>
              <option value="DE">DE</option>
              <option value="DT">DT</option>
              <option value="LB">LB</option>
              <option value="CB">CB</option>
              <option value="FS">FS</option>
              <option value="SS">SS</option>
              <option value="K">K</option>
              <option value="P">P</option> <option value="FLEX">FLEX</option>
            </select>
            {/* Campos de contacto de emergencia */}
            <div className="col-span-2">
              <h3 className="text-lg font-semibold mb-2">Contacto de Emergencia</h3>
            </div>
            <input
              name="emergencyContact.name"
              value={form.emergencyContact.name}
              onChange={handleChange}
              placeholder="Nombre del contacto"
              className="w-full border px-3 py-2 rounded"
            />
            <input
              name="emergencyContact.relationship"
              value={form.emergencyContact.relationship}
              onChange={handleChange}
              placeholder="Relación (padre, madre, hermano, etc.)"
              className="w-full border px-3 py-2 rounded"
            />
            <input
              name="emergencyContact.phone"
              value={form.emergencyContact.phone}
              onChange={handleChange}
              placeholder="Teléfono del contacto"
              className="w-full border px-3 py-2 rounded"
            />
            <input
              name="emergencyContact.email"
              type="email"
              value={form.emergencyContact.email}
              onChange={handleChange}
              placeholder="Email del contacto"
              className="w-full border px-3 py-2 rounded"
            />
            <input
              name="registrationDate"
              type="date"
              value={form.registrationDate}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              required
            />
            <select
              name="team"
              value={form.team}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              required
            >
              <option value="">Selecciona un equipo</option>
              {teams.map((team) => (
                <option key={team._id} value={team._id}>
                  {team.name} - {team.shortName} ({team.division.name})
                </option>
              ))}
            </select>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            >
              {" "}
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="injured">Lesionado</option>
              <option value="suspended">Suspendido</option>
            </select>
            <div className="col-span-2">
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
                disabled={loading}
              >
                {" "}
                {loading ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminProtection>
  );
}
