"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import ImageUploader from "@/components/ImageUploader";
import InlineFeedback from "@/components/InlineFeedback";
import { useAuth } from "@/hooks/useAuth";

interface Division {
  _id: string;
  name: string;
  category: string;
  tournament: {
    _id: string;
    name: string;
  };
}

export default function EditTeamPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const teamId = params?.id as string;
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
      socialMedia: {
        facebook: "",
        instagram: "",
        x: "",
      },
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
    registrationDate: "",
    status: "active",
  });
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [teamEmails, setTeamEmails] = useState({ contact: "", coaches: [] as string[] });
  const userEmail = user?.email.trim().toLowerCase();
  const canManageTeamPhotos = user?.role === "admin";
  const canEdit =
    !!userEmail &&
    (user?.role === "admin" ||
      userEmail === teamEmails.contact.trim().toLowerCase() ||
      teamEmails.coaches.some((coachEmail) => userEmail === coachEmail.trim().toLowerCase()));

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch divisions
        const divisionsRes = await fetch("/api/divisions?limit=100");
        const divisionsData = await divisionsRes.json();
        if (divisionsData.success) {
          setDivisions(divisionsData.data);
        }

        // Fetch team data
        if (teamId) {
          const teamRes = await fetch(`/api/teams/${teamId}`);
          const teamData = await teamRes.json();
          if (teamData.success) {
            const team = teamData.data;
            const teamCoaches = team.coaches && team.coaches.length > 0 ? team.coaches : team.coach ? [team.coach] : [];

            setTeamEmails({
              contact: team.contact?.email || "",
              coaches: teamCoaches.map((coach: { email?: string }) => coach.email || "").filter(Boolean),
            });
            setForm({
              name: team.name || "",
              shortName: team.shortName || "",
              logo: team.logo || "",
              backgroundImage: team.backgroundImage || "",
              division: team.division?._id || "",
              colors: {
                primary: team.colors?.primary || "#000000",
                secondary: team.colors?.secondary || "#FFFFFF",
              },
              contact: {
                email: team.contact?.email || "",
                phone: team.contact?.phone || "",
                address: team.contact?.address || "",
                socialMedia: {
                  facebook: team.contact?.socialMedia?.facebook || "",
                  instagram: team.contact?.socialMedia?.instagram || "",
                  x: team.contact?.socialMedia?.x || team.contact?.socialMedia?.twitter || "",
                },
              },
              coaches: [
                {
                  name: teamCoaches[0]?.name || "",
                  email: teamCoaches[0]?.email || "",
                  phone: teamCoaches[0]?.phone || "",
                  experience: teamCoaches[0]?.experience || "",
                },
                {
                  name: teamCoaches[1]?.name || "",
                  email: teamCoaches[1]?.email || "",
                  phone: teamCoaches[1]?.phone || "",
                  experience: teamCoaches[1]?.experience || "",
                },
              ],
              registrationDate: team.registrationDate
                ? new Date(team.registrationDate).toISOString().split("T")[0]
                : "",
              status: team.status || "active",
            });
          } else {
            setError("No se pudo cargar el equipo");
          }
        }
      } catch {
        setError("Error de conexión");
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [teamId]);

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

  const handleSocialMediaChange = (platform: "facebook" | "instagram" | "x", value: string) => {
    setForm((prev) => ({
      ...prev,
      contact: {
        ...prev.contact,
        socialMedia: {
          ...prev.contact.socialMedia,
          [platform]: value,
        },
      },
    }));
  };

  const handleCoachChange = (index: number, field: "name" | "email" | "phone" | "experience", value: string) => {
    setForm((prev) => ({
      ...prev,
      coaches: prev.coaches.map((coach, coachIndex) => (coachIndex === index ? { ...coach, [field]: value } : coach)),
    }));
  };

  const toNullable = (value: string) => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          contact: {
            ...form.contact,
            socialMedia: {
              facebook: toNullable(form.contact.socialMedia.facebook),
              instagram: toNullable(form.contact.socialMedia.instagram),
              x: toNullable(form.contact.socialMedia.x),
            },
          },
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
        setError(data.message || "Error al editar equipo");
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
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Cargando equipo...</p>
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
            Solo el contacto del equipo, el entrenador o un administrador pueden editar este equipo.
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
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Editar Equipo</h1>
              <p className="mt-2 text-gray-600">Modifique la información del equipo</p>
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
                    >
                      <option value="">Seleccionar división</option>
                      {divisions.map((division) => (
                        <option key={division._id} value={division._id}>
                          {division.name}
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
                  <div>
                    <label
                      htmlFor="contact.socialMedia.facebook"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Facebook
                    </label>
                    <input
                      id="contact.socialMedia.facebook"
                      name="contact.socialMedia.facebook"
                      type="url"
                      value={form.contact.socialMedia.facebook}
                      onChange={(event) => handleSocialMediaChange("facebook", event.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://facebook.com/tu-equipo"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="contact.socialMedia.instagram"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Instagram
                    </label>
                    <input
                      id="contact.socialMedia.instagram"
                      name="contact.socialMedia.instagram"
                      type="url"
                      value={form.contact.socialMedia.instagram}
                      onChange={(event) => handleSocialMediaChange("instagram", event.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://instagram.com/tu-equipo"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="contact.socialMedia.x" className="block text-sm font-medium text-gray-700 mb-1">
                      X
                    </label>
                    <input
                      id="contact.socialMedia.x"
                      name="contact.socialMedia.x"
                      type="url"
                      value={form.contact.socialMedia.x}
                      onChange={(event) => handleSocialMediaChange("x", event.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://x.com/tu-equipo"
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
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
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
                    {canManageTeamPhotos ? (
                      <ImageUploader
                        label="Logo del Equipo"
                        assetType="team_logo"
                        value={form.logo}
                        onUploaded={(url) => setForm((prev) => ({ ...prev, logo: url }))}
                        disabled={loading}
                        ownerType="team"
                        ownerId={teamId}
                      />
                    ) : (
                      <label className="block text-sm font-medium text-gray-700 mb-1">Logo del Equipo</label>
                    )}
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
                    {canManageTeamPhotos ? (
                      <ImageUploader
                        label="Imagen de Fondo del Equipo"
                        assetType="team_background"
                        value={form.backgroundImage}
                        onUploaded={(url) => setForm((prev) => ({ ...prev, backgroundImage: url }))}
                        disabled={loading}
                        ownerType="team"
                        ownerId={teamId}
                      />
                    ) : (
                      <label className="block text-sm font-medium text-gray-700 mb-1">Imagen de Fondo del Equipo</label>
                    )}
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
                  {!canManageTeamPhotos && (
                    <InlineFeedback
                      compact
                      className="md:col-span-2"
                      variant="warning"
                      title="Fotos bloqueadas"
                      message="Solo usuarios con rol Admin pueden modificar las fotos del equipo."
                    />
                  )}
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

              {error && <InlineFeedback variant="error" title="No pudimos guardar el equipo" message={error} />}

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
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {" "}
                  {loading ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
