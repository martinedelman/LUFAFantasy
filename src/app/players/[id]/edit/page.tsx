"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import ImageUploader from "@/components/ImageUploader";
import InlineFeedback from "@/components/InlineFeedback";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";

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
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const playerId = params?.id as string;
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    profilePicture: "",
    email: "",
    phone: "",
    dateOfBirth: "",
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
    registrationDate: "",
    status: "active",
  });
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [playerEmail, setPlayerEmail] = useState("");
  const canEdit =
    !!user && (user.role === "admin" || user.email.trim().toLowerCase() === playerEmail.trim().toLowerCase());

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
            setPlayerEmail(player.email || "");
            setForm({
              firstName: player.firstName || "",
              lastName: player.lastName || "",
              profilePicture: player.profilePicture || "",
              email: player.email || "",
              phone: player.phone || "",
              dateOfBirth: player.dateOfBirth ? new Date(player.dateOfBirth).toISOString().split("T")[0] : "",
              team: player.team?._id || "",
              jerseyNumber: player.jerseyNumber?.toString() || "",
              position: player.position || "QB",
              secondaryPosition: player.secondaryPosition || "",
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
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/auth/signin");
    }
  }, [isAuthLoading, router, user]);

  if (isAuthLoading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Cargando jugador...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Debes iniciar sesión para editar.</div>;
  }

  if (!canEdit) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow text-center max-w-md">
          <h2 className="text-xl font-bold mb-2 text-gray-900">Acceso denegado</h2>
          <p className="text-gray-600 mb-4">
            Solo el jugador asociado a este email o un administrador puede editar este perfil.
          </p>
          <button
            onClick={() => router.back()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-6">Editar Jugador</h1>

          {error && (
            <InlineFeedback className="mb-6" variant="error" title="No pudimos guardar el jugador" message={error} />
          )}

          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <h2 className="text-xl font-semibold mb-4">Información Personal</h2>
            </div>
            <div className="col-span-2">
              <ImageUploader
                label="Foto de Perfil"
                assetType="player_profile_picture"
                value={form.profilePicture}
                onUploaded={(url) => setForm((prev) => ({ ...prev, profilePicture: url }))}
                disabled={loading}
                enableCrop
                ownerType="player"
                ownerId={playerId}
              />
              <input
                name="profilePicture"
                type="text"
                value={form.profilePicture}
                readOnly
                className="mt-2 w-full border px-3 py-2 rounded bg-gray-100 text-gray-600"
                placeholder="URL generada automáticamente"
              />
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
            <select
              name="secondaryPosition"
              value={form.secondaryPosition}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
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
                className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" color="white" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  "Guardar Cambios"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
