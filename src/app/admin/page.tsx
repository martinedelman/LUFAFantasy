"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import AdminProtection from "@/components/AdminProtection";
import InlineFeedback from "@/components/InlineFeedback";
import LoadingSpinner from "@/components/LoadingSpinner";
import Toast from "@/components/Toast";
import { useAuth } from "@/hooks/useAuth";
import type {
  AdminAuditLogResponseDto,
  AdminPlayerImportDryRunResponseDto,
  AdminSystemHealthResponseDto,
  AdminSystemStatsResponseDto,
  AdminUserResponseDto,
  ApiResponseDto,
  CreateJudgeRequestDto,
  FlagInterestResponseDto,
  JudgeResponseDto,
  SiteSettingsResponseDto,
  SiteSponsorResponseDto,
  UpdateAdminUserRequestDto,
  UpdateSiteSettingsRequestDto,
} from "@/app/DTOs";
import type { UserRole } from "@/entities/User";

type AdminTab = "overview" | "users" | "pending" | "content" | "system" | "audit";

type AdminToastState = {
  variant: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
};

type GameEventCorrectionResponse = {
  _id: string;
  game: {
    _id: string;
    label: string;
    tournament?: string;
    division?: string;
  };
  operation: "create" | "update" | "delete";
  proposedEvent?: CorrectionEventSummary;
  originalEvent?: CorrectionEventSummary;
  requestedByName?: string;
  requestedByEmail?: string;
  createdAt?: string;
};

type CorrectionEventSummary = {
  quarter?: number;
  type?: string;
  teamName?: string;
  playerName?: string;
  points?: number;
};

const tabs: Array<{ id: AdminTab; label: string }> = [
  { id: "overview", label: "Resumen" },
  { id: "users", label: "Usuarios" },
  { id: "pending", label: "Pendientes" },
  { id: "content", label: "Contenido" },
  { id: "system", label: "Sistema" },
  { id: "audit", label: "Auditoría" },
];

const roleOptions: Array<{ value: UserRole; label: string }> = [
  { value: "user", label: "Usuario" },
  { value: "admin", label: "Admin" },
  { value: "juez", label: "Juez" },
  { value: "entrenador_juveniles", label: "Entrenador juveniles" },
];

const interestOptions = [
  { value: "", label: "Todos" },
  { value: "play", label: "Jugador" },
  { value: "child", label: "Menor" },
  { value: "team", label: "Equipo" },
  { value: "coach", label: "Entrenador" },
  { value: "referee", label: "Árbitro" },
  { value: "sponsor", label: "Sponsor" },
  { value: "school", label: "Institución" },
  { value: "other", label: "Otro" },
];

const emptyStats: AdminSystemStatsResponseDto = {
  totalUsers: 0,
  activeUsers: 0,
  inactiveUsers: 0,
  totalAdmins: 0,
  totalYouthCoaches: 0,
  totalJudges: 0,
  activeTournaments: 0,
  upcomingTournaments: 0,
  totalTeams: 0,
  activeTeams: 0,
  totalPlayers: 0,
  activePlayers: 0,
  preApprovedPlayers: 0,
  totalGames: 0,
  completedGames: 0,
  scheduledGames: 0,
  inProgressGames: 0,
  pendingCorrections: 0,
  pendingFlagInterests: 0,
  playerFlagInterests: 0,
  sponsorFlagInterests: 0,
};

const emptySettings: SiteSettingsResponseDto = {
  whatsappMessageTemplate:
    "Hola {nombre}, te escribimos de LUFA Flag por tu inscripción para jugar. Queremos contarte los próximos pasos para sumarte a juveniles.",
  contactEmail: "lufaflag@gmail.com",
  contactWhatsapp: "",
  instagramUrl: "https://www.instagram.com/lufaflag.uy/",
  whatsappChannelUrl: "https://whatsapp.com/channel/0029VbCnCzqKLaHqPlaOvV3W",
  sponsors: [],
  homepageAnnouncement: {
    enabled: false,
    title: "",
    body: "",
    imageUrl: "",
    ctaLabel: "",
    ctaUrl: "",
  },
  featureVisibility: {
    sumateEnabled: true,
    sponsorsVisible: true,
  },
};

function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-UY", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function isPublicPathOrUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith("/")) return true;

  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function operationLabel(operation: GameEventCorrectionResponse["operation"]) {
  if (operation === "create") return "Agregar evento";
  if (operation === "update") return "Editar evento";
  return "Eliminar evento";
}

function eventSummary(event?: CorrectionEventSummary) {
  if (!event) return "Sin datos";
  const parts = [
    event.type,
    event.quarter ? `${event.quarter === 5 ? "ET" : `${event.quarter}T`}` : undefined,
    event.teamName,
    event.playerName,
    event.points !== undefined ? `${event.points} pts` : undefined,
  ].filter(Boolean);
  return parts.join(" · ") || "Sin datos";
}

function normalizeWhatsAppPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("598")) return digits;
  if (digits.startsWith("0") && digits.length === 9) return `598${digits.slice(1)}`;
  if (digits.length === 8 || digits.length === 9) return `598${digits}`;
  return digits;
}

function applyMessageTemplate(template: string, interest: FlagInterestResponseDto) {
  return template
    .replaceAll("{nombre}", interest.name)
    .replaceAll("{ubicacion}", interest.location)
    .replaceAll("{edad}", interest.ageRange)
    .replaceAll("{experiencia}", interest.experience || "Sin experiencia indicada");
}

function buildWhatsAppUrl(interest: FlagInterestResponseDto, messageTemplate: string) {
  const phone = normalizeWhatsAppPhone(interest.whatsappDigits || interest.whatsapp);
  return `https://wa.me/${phone}?text=${encodeURIComponent(applyMessageTemplate(messageTemplate, interest))}`;
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const payload = (await response.json()) as ApiResponseDto<T>;

  if (!response.ok || !payload.success) {
    throw new Error(payload.message || "Error de conexión");
  }

  return payload.data as T;
}

function StatCard({ label, value, detail }: { label: string; value: number; detail?: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
    </article>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        ok ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
      }`}
    >
      {label}
    </span>
  );
}

function HelpIcon({ text }: { text: string }) {
  return (
    <span
      title={text}
      aria-label={text}
      tabIndex={0}
      className="group/help relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-[11px] font-bold text-slate-600 outline-none transition hover:border-brand-500 hover:bg-brand-100 hover:text-brand-800 focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      ?
      <span className="pointer-events-none absolute left-1/2 top-7 z-30 hidden w-64 -translate-x-1/2 rounded-md bg-slate-950 px-3 py-2 text-left text-xs font-medium leading-5 text-white shadow-lg group-hover/help:block group-focus/help:block">
        {text}
      </span>
    </span>
  );
}

function FieldTitle({ children, help }: { children: ReactNode; help: string }) {
  return (
    <span className="mb-1 flex items-center gap-2">
      <span>{children}</span>
      <HelpIcon text={help} />
    </span>
  );
}

function AdminPanelContent() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [stats, setStats] = useState<AdminSystemStatsResponseDto>(emptyStats);
  const [users, setUsers] = useState<AdminUserResponseDto[]>([]);
  const [judges, setJudges] = useState<JudgeResponseDto[]>([]);
  const [corrections, setCorrections] = useState<GameEventCorrectionResponse[]>([]);
  const [flagInterests, setFlagInterests] = useState<FlagInterestResponseDto[]>([]);
  const [settings, setSettings] = useState<SiteSettingsResponseDto>(emptySettings);
  const [settingsDraft, setSettingsDraft] = useState<SiteSettingsResponseDto>(emptySettings);
  const [health, setHealth] = useState<AdminSystemHealthResponseDto | null>(null);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<AdminToastState | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [userFilters, setUserFilters] = useState({ search: "", role: "", status: "" });
  const [interestTypeFilter, setInterestTypeFilter] = useState("");
  const [auditFilters, setAuditFilters] = useState({ actorEmail: "", action: "", entityType: "" });
  const [judgeForm, setJudgeForm] = useState<CreateJudgeRequestDto>({ firstName: "", lastName: "" });
  const [importResult, setImportResult] = useState<AdminPlayerImportDryRunResponseDto | null>(null);

  const fetchUsers = async (filters = userFilters) => {
    const params = new URLSearchParams();
    if (filters.search.trim()) params.set("search", filters.search.trim());
    if (filters.role) params.set("role", filters.role);
    if (filters.status) params.set("status", filters.status);
    const query = params.toString();
    setUsers(await apiFetch<AdminUserResponseDto[]>(`/api/admin/users${query ? `?${query}` : ""}`));
  };

  const fetchInterests = async (interestType = interestTypeFilter) => {
    const query = interestType ? `?interestType=${encodeURIComponent(interestType)}` : "";
    setFlagInterests(await apiFetch<FlagInterestResponseDto[]>(`/api/admin/flag-interests${query}`));
  };

  const fetchAuditLogs = async (filters = auditFilters) => {
    const params = new URLSearchParams();
    if (filters.actorEmail.trim()) params.set("actorEmail", filters.actorEmail.trim());
    if (filters.action.trim()) params.set("action", filters.action.trim());
    if (filters.entityType.trim()) params.set("entityType", filters.entityType.trim());
    const query = params.toString();
    setAuditLogs(await apiFetch<AdminAuditLogResponseDto[]>(`/api/admin/audit-logs${query ? `?${query}` : ""}`));
  };

  const fetchData = async () => {
    const [nextStats, nextJudges, nextCorrections, nextUsers, nextSettings, nextInterests, nextHealth, nextAuditLogs] =
      await Promise.all([
        apiFetch<AdminSystemStatsResponseDto>("/api/admin/stats"),
        apiFetch<JudgeResponseDto[]>("/api/judges"),
        apiFetch<GameEventCorrectionResponse[]>("/api/admin/game-event-corrections"),
        apiFetch<AdminUserResponseDto[]>("/api/admin/users"),
        apiFetch<SiteSettingsResponseDto>("/api/admin/settings"),
        apiFetch<FlagInterestResponseDto[]>("/api/admin/flag-interests"),
        apiFetch<AdminSystemHealthResponseDto>("/api/admin/system-health"),
        apiFetch<AdminAuditLogResponseDto[]>("/api/admin/audit-logs"),
      ]);

    setStats(nextStats);
    setJudges(nextJudges);
    setCorrections(nextCorrections);
    setUsers(nextUsers);
    setSettings(nextSettings);
    setSettingsDraft(nextSettings);
    setFlagInterests(nextInterests);
    setHealth(nextHealth);
    setAuditLogs(nextAuditLogs);
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    const tab = url.searchParams.get("tab") as AdminTab | null;
    if (tab && tabs.some((item) => item.id === tab)) {
      setActiveTab(tab);
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        await fetchData();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Error al cargar el panel");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const setTab = (tab: AdminTab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", url.toString());
  };

  const refreshStatsAndAudit = async () => {
    const [nextStats, nextAuditLogs] = await Promise.all([
      apiFetch<AdminSystemStatsResponseDto>("/api/admin/stats"),
      apiFetch<AdminAuditLogResponseDto[]>("/api/admin/audit-logs"),
    ]);
    setStats(nextStats);
    setAuditLogs(nextAuditLogs);
  };

  const showConfigurationError = (message: string) => {
    setToast({
      variant: "error",
      title: "No se pudo guardar la configuración",
      message,
    });
  };

  const showSuccessToast = (message: string) => {
    setToast({
      variant: "success",
      title: "Listo",
      message,
    });
  };

  const runAction = async (
    key: string,
    action: () => Promise<void>,
    options: { showErrorAsToast?: boolean; toastTitle?: string } = {},
  ) => {
    try {
      setBusyKey(key);
      setActionError(null);
      if (options.showErrorAsToast) setToast(null);
      await action();
    } catch (actionErrorValue) {
      const message = actionErrorValue instanceof Error ? actionErrorValue.message : "No se pudo completar la acción";

      if (options.showErrorAsToast) {
        setToast({
          variant: "error",
          title: options.toastTitle || "No se pudo completar",
          message,
        });
      } else {
        setActionError(message);
      }
    } finally {
      setBusyKey(null);
    }
  };

  const handleUpdateUser = async (target: AdminUserResponseDto, patch: UpdateAdminUserRequestDto) => {
    await runAction(`user-${target.id}`, async () => {
      const updated = await apiFetch<AdminUserResponseDto>(`/api/admin/users/${target.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      showSuccessToast(`Usuario ${updated.email} actualizado`);
      await refreshStatsAndAudit();
    });
  };

  const handleCorrectionReview = async (correctionId: string, action: "approve" | "reject") => {
    await runAction(`correction-${correctionId}`, async () => {
      await apiFetch<never>(`/api/admin/game-event-corrections/${correctionId}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      setCorrections((current) => current.filter((correction) => correction._id !== correctionId));
      window.dispatchEvent(new Event("lufa:live-corrections-updated"));
      showSuccessToast(action === "approve" ? "Corrección aprobada y aplicada" : "Corrección rechazada");
      await refreshStatsAndAudit();
    });
  };

  const handleCreateJudge = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const firstName = judgeForm.firstName.trim();
    const lastName = judgeForm.lastName.trim();
    if (!firstName || !lastName) {
      setActionError("Nombre y apellido son obligatorios");
      return;
    }

    await runAction("judge-create", async () => {
      const created = await apiFetch<JudgeResponseDto>("/api/judges", {
        method: "POST",
        body: JSON.stringify({ firstName, lastName } satisfies CreateJudgeRequestDto),
      });
      setJudges((current) =>
        [...current, created].sort((left, right) =>
          `${left.lastName} ${left.firstName}`.localeCompare(`${right.lastName} ${right.firstName}`, "es", {
            sensitivity: "base",
          }),
        ),
      );
      setJudgeForm({ firstName: "", lastName: "" });
      showSuccessToast("Juez creado correctamente");
      await refreshStatsAndAudit();
    });
  };

  const handleSaveSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const whatsappTemplate = settingsDraft.whatsappMessageTemplate.trim();
    if (whatsappTemplate.length < 10) {
      showConfigurationError("El mensaje automático de WhatsApp debe tener al menos 10 caracteres.");
      return;
    }

    const incompleteSponsorIndex = settingsDraft.sponsors.findIndex(
      (sponsor) => sponsor.visible && (!sponsor.name.trim() || !sponsor.image.trim()),
    );
    if (incompleteSponsorIndex >= 0) {
      showConfigurationError(
        `El sponsor ${incompleteSponsorIndex + 1} está visible pero le falta nombre o imagen. Completalo o marcá el sponsor como no visible.`,
      );
      return;
    }

    const invalidSponsorImageIndex = settingsDraft.sponsors.findIndex(
      (sponsor) => sponsor.visible && sponsor.image.trim() && !sponsor.image.trim().startsWith("/"),
    );
    if (invalidSponsorImageIndex >= 0) {
      showConfigurationError(
        `La imagen del sponsor ${invalidSponsorImageIndex + 1} debe ser una ruta pública que empiece con "/"; por ejemplo /sponsors/logo.png.`,
      );
      return;
    }

    const announcement = settingsDraft.homepageAnnouncement;
    const announcementHasContent = announcement.title.trim() || announcement.body.trim();
    if (announcement.enabled && !announcementHasContent) {
      showConfigurationError("Para activar el aviso público tenés que cargar al menos un título o un texto.");
      return;
    }

    if (announcement.imageUrl.trim() && !isPublicPathOrUrl(announcement.imageUrl)) {
      showConfigurationError(
        'La imagen del aviso público debe ser una ruta pública que empiece con "/" o una URL completa con http/https.',
      );
      return;
    }

    if (announcement.ctaLabel.trim() && !announcement.ctaUrl.trim()) {
      showConfigurationError("Si cargás el texto del botón del aviso público, también tenés que cargar el link.");
      return;
    }

    if (announcement.ctaUrl.trim() && !announcement.ctaLabel.trim()) {
      showConfigurationError("Si cargás el link del botón del aviso público, también tenés que cargar el texto del botón.");
      return;
    }

    if (announcement.ctaUrl.trim() && !isPublicPathOrUrl(announcement.ctaUrl)) {
      showConfigurationError(
        'El link del botón del aviso público debe ser una ruta interna que empiece con "/" o una URL completa con http/https.',
      );
      return;
    }

    await runAction("settings-save", async () => {
      const body: UpdateSiteSettingsRequestDto = {
        whatsappMessageTemplate: whatsappTemplate,
        contactEmail: settingsDraft.contactEmail,
        contactWhatsapp: settingsDraft.contactWhatsapp,
        instagramUrl: settingsDraft.instagramUrl,
        whatsappChannelUrl: settingsDraft.whatsappChannelUrl,
        sponsors: settingsDraft.sponsors,
        homepageAnnouncement: settingsDraft.homepageAnnouncement,
        featureVisibility: settingsDraft.featureVisibility,
      };
      const saved = await apiFetch<SiteSettingsResponseDto>("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setSettings(saved);
      setSettingsDraft(saved);
      showSuccessToast("Configuración guardada");
      await fetchAuditLogs();
    }, {
      showErrorAsToast: true,
      toastTitle: "No se pudo guardar la configuración",
    });
  };

  const handleRunImportDryRun = async () => {
    await runAction("import-dry-run", async () => {
      const result = await apiFetch<AdminPlayerImportDryRunResponseDto>("/api/admin/player-import/dry-run", {
        method: "POST",
      });
      setImportResult(result);
      showSuccessToast("Dry-run de importación completado");
      await fetchAuditLogs();
    });
  };

  const updateSponsor = (index: number, patch: Partial<SiteSponsorResponseDto>) => {
    setSettingsDraft((current) => ({
      ...current,
      sponsors: current.sponsors.map((sponsor, sponsorIndex) =>
        sponsorIndex === index ? { ...sponsor, ...patch } : sponsor,
      ),
    }));
  };

  const addSponsor = () => {
    setSettingsDraft((current) => ({
      ...current,
      sponsors: [
        ...current.sponsors,
        {
          name: "",
          image: "",
          description: "",
          url: "",
          visible: true,
          order: current.sponsors.length,
        },
      ],
    }));
  };

  const removeSponsor = (index: number) => {
    setSettingsDraft((current) => ({
      ...current,
      sponsors: current.sponsors.filter((_, sponsorIndex) => sponsorIndex !== index),
    }));
  };

  const criticalAlerts = useMemo(
    () => [
      ...(stats.pendingCorrections > 0
        ? [`${stats.pendingCorrections} correcciones Live pendientes`]
        : []),
      ...(stats.preApprovedPlayers > 0 ? [`${stats.preApprovedPlayers} jugadores pre-aprobados`] : []),
      ...(health?.crons.some((cron) => !cron.ok) ? ["Hay crons faltantes o inesperados"] : []),
      ...(health?.checks.some((check) => !check.ok) ? ["Hay configuración sensible faltante"] : []),
    ],
    [health, stats],
  );

  const userRoleCounts = useMemo(
    () =>
      roleOptions.map((option) => ({
        ...option,
        count: users.filter((item) => item.role === option.value).length,
      })),
    [users],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto flex min-h-[360px] max-w-7xl items-center justify-center rounded-lg border border-slate-200 bg-white">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Toast
        open={Boolean(toast)}
        variant={toast?.variant || "info"}
        title={toast?.title}
        message={toast?.message || ""}
        durationMs={toast?.variant === "error" ? null : 5000}
        onClose={() => setToast(null)}
      />
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Administración</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Panel LUFA Flag</h1>
            <p className="mt-2 text-sm text-slate-600">
              Backoffice operativo para usuarios, pendientes, contenido, sistema y auditoría.
            </p>
          </div>
          <div className="text-sm text-slate-600">
            Sesión admin: <span className="font-semibold text-slate-950">{user?.email}</span>
          </div>
        </header>

        {error ? <InlineFeedback variant="error" title="No pudimos cargar el panel" message={error} /> : null}
        {actionError ? <InlineFeedback variant="error" title="Acción no completada" message={actionError} /> : null}

        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <nav className="h-fit rounded-lg border border-slate-200 bg-white p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTab(tab.id)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-semibold transition ${
                  activeTab === tab.id ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {tab.label}
                {tab.id === "pending" && stats.pendingCorrections + stats.pendingFlagInterests > 0 ? (
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">
                    {stats.pendingCorrections + stats.pendingFlagInterests}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>

          <div className="min-w-0">
            {activeTab === "overview" && (
              <section className="space-y-6">
                {criticalAlerts.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-bold uppercase tracking-wide text-amber-800">Atención</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {criticalAlerts.map((alert) => (
                        <span key={alert} className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-amber-900">
                          {alert}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard label="Usuarios" value={stats.totalUsers} detail={`${stats.activeUsers} activos`} />
                  <StatCard label="Administradores" value={stats.totalAdmins} detail={`${stats.totalYouthCoaches} juveniles`} />
                  <StatCard label="Jugadores" value={stats.totalPlayers} detail={`${stats.preApprovedPlayers} pre-aprobados`} />
                  <StatCard label="Partidos" value={stats.totalGames} detail={`${stats.inProgressGames} en curso`} />
                  <StatCard label="Torneos activos" value={stats.activeTournaments} detail={`${stats.upcomingTournaments} próximos`} />
                  <StatCard label="Equipos" value={stats.totalTeams} detail={`${stats.activeTeams} activos`} />
                  <StatCard label="Inscripciones" value={stats.pendingFlagInterests} detail={`${stats.playerFlagInterests} jugadores`} />
                  <StatCard label="Correcciones Live" value={stats.pendingCorrections} detail="Pendientes de revisión" />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <section className="rounded-lg border border-slate-200 bg-white p-5">
                    <h2 className="text-lg font-semibold">Distribución de roles</h2>
                    <div className="mt-4 space-y-3">
                      {userRoleCounts.map((role) => (
                        <div key={role.value} className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-sm font-medium text-slate-700">{role.label}</span>
                          <span className="text-sm font-bold text-slate-950">{role.count}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-lg border border-slate-200 bg-white p-5">
                    <h2 className="text-lg font-semibold">Estado del sistema</h2>
                    <div className="mt-4 space-y-3">
                      {health?.checks.slice(0, 6).map((check) => (
                        <div key={check.id} className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-sm font-medium text-slate-700">{check.label}</span>
                          <StatusPill ok={check.ok} label={check.detail} />
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </section>
            )}

            {activeTab === "users" && (
              <section className="space-y-5">
                <div className="rounded-lg border border-slate-200 bg-white p-5">
                  <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
                    <input
                      type="search"
                      value={userFilters.search}
                      onChange={(event) => setUserFilters((current) => ({ ...current, search: event.target.value }))}
                      placeholder="Buscar por nombre o email"
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                    <select
                      value={userFilters.role}
                      onChange={(event) => setUserFilters((current) => ({ ...current, role: event.target.value }))}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="">Todos los roles</option>
                      {roleOptions.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={userFilters.status}
                      onChange={(event) => setUserFilters((current) => ({ ...current, status: event.target.value }))}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="">Todos los estados</option>
                      <option value="active">Activos</option>
                      <option value="inactive">Inactivos</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => fetchUsers()}
                      className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Filtrar
                    </button>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-slate-600">Usuario</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-600">Rol</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-600">Estado</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-600">Alta</th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-600">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {users.map((adminUser) => {
                          const isSelf = adminUser.id === user?.id;
                          const isBusy = busyKey === `user-${adminUser.id}`;

                          return (
                            <tr key={adminUser.id}>
                              <td className="px-4 py-3">
                                <p className="font-semibold text-slate-950">{adminUser.name}</p>
                                <p className="text-xs text-slate-500">{adminUser.email}</p>
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  value={adminUser.role}
                                  disabled={isBusy || isSelf}
                                  onChange={(event) =>
                                    handleUpdateUser(adminUser, { role: event.target.value as UserRole })
                                  }
                                  className="rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100"
                                >
                                  {roleOptions.map((role) => (
                                    <option key={role.value} value={role.value}>
                                      {role.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3">
                                <StatusPill ok={adminUser.isActive} label={adminUser.isActive ? "Activo" : "Inactivo"} />
                              </td>
                              <td className="px-4 py-3 text-slate-600">{formatDate(adminUser.createdAt)}</td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  disabled={isBusy || isSelf}
                                  onClick={() => handleUpdateUser(adminUser, { isActive: !adminUser.isActive })}
                                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {isBusy ? "Guardando..." : adminUser.isActive ? "Desactivar" : "Activar"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {activeTab === "pending" && (
              <section className="space-y-6">
                <section className="rounded-lg border border-slate-200 bg-white p-5">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">Correcciones Live pendientes</h2>
                      <p className="text-sm text-slate-600">{corrections.length} solicitudes esperando revisión</p>
                    </div>
                  </div>
                  <div className="mt-4 divide-y divide-slate-100 rounded-md border border-slate-200">
                    {corrections.length === 0 ? (
                      <p className="p-4 text-sm text-slate-500">No hay correcciones pendientes.</p>
                    ) : (
                      corrections.map((correction) => (
                        <article key={correction._id} className="p-4">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2">
                                <StatusPill ok={false} label="Pendiente" />
                                <span className="text-sm font-semibold">{operationLabel(correction.operation)}</span>
                              </div>
                              <p className="font-semibold">{correction.game.label}</p>
                              <p className="text-sm text-slate-600">
                                {[correction.game.tournament, correction.game.division].filter(Boolean).join(" · ")}
                              </p>
                              <p className="text-sm text-slate-700">
                                Solicitado por: {correction.requestedByName || correction.requestedByEmail || "Juez"}
                              </p>
                              {correction.operation !== "create" && (
                                <p className="text-sm text-slate-700">Actual: {eventSummary(correction.originalEvent)}</p>
                              )}
                              {correction.operation !== "delete" && (
                                <p className="text-sm text-slate-700">Propuesto: {eventSummary(correction.proposedEvent)}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={Boolean(busyKey)}
                                onClick={() => handleCorrectionReview(correction._id, "reject")}
                                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold"
                              >
                                Rechazar
                              </button>
                              <button
                                type="button"
                                disabled={Boolean(busyKey)}
                                onClick={() => handleCorrectionReview(correction._id, "approve")}
                                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
                              >
                                Aprobar
                              </button>
                            </div>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">Inscripciones de Sumate</h2>
                      <p className="text-sm text-slate-600">{flagInterests.length} formularios cargados</p>
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={interestTypeFilter}
                        onChange={(event) => setInterestTypeFilter(event.target.value)}
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                      >
                        {interestOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => fetchInterests()}
                        className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                      >
                        Filtrar
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 divide-y divide-slate-100 rounded-md border border-slate-200">
                    {flagInterests.length === 0 ? (
                      <p className="p-4 text-sm text-slate-500">No hay inscripciones para este filtro.</p>
                    ) : (
                      flagInterests.map((interest) => (
                        <article key={interest.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
                          <div>
                            <p className="font-semibold">{interest.name}</p>
                            <p className="text-sm text-slate-600">
                              {interest.interestLabel} · {interest.location} · {interest.ageRange}
                            </p>
                            <p className="text-sm text-slate-500">{interest.whatsapp}</p>
                          </div>
                          <div className="flex flex-wrap gap-2 md:justify-end">
                            {["play", "child"].includes(interest.interestType) ? (
                              <a
                                href={buildWhatsAppUrl(interest, settings.whatsappMessageTemplate)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white"
                              >
                                WhatsApp
                              </a>
                            ) : null}
                            <span className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600">
                              {formatDate(interest.createdAt)}
                            </span>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </section>
              </section>
            )}

            {activeTab === "content" && (
              <form className="space-y-6" onSubmit={handleSaveSettings}>
                <section className="rounded-lg border border-slate-200 bg-white p-5">
                  <h2 className="text-lg font-semibold">Configuración pública editable</h2>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      <FieldTitle help="Email público de contacto de LUFA Flag. Se usa como dato institucional visible o disponible para formularios y consultas.">
                        Email de contacto
                      </FieldTitle>
                      <input
                        type="email"
                        value={settingsDraft.contactEmail}
                        onChange={(event) => setSettingsDraft((current) => ({ ...current, contactEmail: event.target.value }))}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block text-sm font-semibold text-slate-700">
                      <FieldTitle help="Número público de WhatsApp para consultas generales. Si está vacío, no se publica un contacto de WhatsApp directo.">
                        WhatsApp de contacto
                      </FieldTitle>
                      <input
                        type="text"
                        value={settingsDraft.contactWhatsapp}
                        onChange={(event) => setSettingsDraft((current) => ({ ...current, contactWhatsapp: event.target.value }))}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block text-sm font-semibold text-slate-700">
                      <FieldTitle help="Link al Instagram oficial que puede mostrarse en zonas públicas del sitio, como contacto o redes.">
                        Instagram
                      </FieldTitle>
                      <input
                        type="url"
                        value={settingsDraft.instagramUrl}
                        onChange={(event) => setSettingsDraft((current) => ({ ...current, instagramUrl: event.target.value }))}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block text-sm font-semibold text-slate-700">
                      <FieldTitle help="Link al canal oficial de WhatsApp. Se usa como CTA para que visitantes se sumen al canal informativo.">
                        Canal de WhatsApp
                      </FieldTitle>
                      <input
                        type="url"
                        value={settingsDraft.whatsappChannelUrl}
                        onChange={(event) =>
                          setSettingsDraft((current) => ({ ...current, whatsappChannelUrl: event.target.value }))
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>

                  <label className="mt-4 block text-sm font-semibold text-slate-700">
                    <FieldTitle help='Plantilla que usa el entrenador de juveniles para contactar inscriptos por WhatsApp. Podés usar variables como "{nombre}" para personalizar el mensaje.'>
                      Mensaje automático de WhatsApp
                    </FieldTitle>
                    <textarea
                      value={settingsDraft.whatsappMessageTemplate}
                      onChange={(event) =>
                        setSettingsDraft((current) => ({ ...current, whatsappMessageTemplate: event.target.value }))
                      }
                      rows={4}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <p className="mt-2 text-xs text-slate-500">
                    Variables disponibles: {"{nombre}"}, {"{ubicacion}"}, {"{edad}"}, {"{experiencia}"}.
                  </p>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">Sponsors</h2>
                      <p className="text-sm text-slate-600">Controla visibilidad y orden de marcas públicas.</p>
                    </div>
                    <button type="button" onClick={addSponsor} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold">
                      Agregar sponsor
                    </button>
                  </div>
                  <div className="mt-4 space-y-3">
                    {settingsDraft.sponsors.map((sponsor, index) => (
                      <div key={`${sponsor.name}-${index}`} className="grid gap-3 rounded-md border border-slate-200 p-3 lg:grid-cols-[1fr_1fr_1fr_80px_90px_auto]">
                        <label className="block text-sm font-semibold text-slate-700">
                          <span className="mb-1 block">Nombre</span>
                          <input
                            type="text"
                            value={sponsor.name}
                            onChange={(event) => updateSponsor(index, { name: event.target.value })}
                            placeholder="Nombre"
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                          />
                        </label>
                        <label className="block text-sm font-semibold text-slate-700">
                          <span className="mb-1 block">Imagen</span>
                          <input
                            type="text"
                            value={sponsor.image}
                            onChange={(event) => updateSponsor(index, { image: event.target.value })}
                            placeholder="/sponsors/logo.png"
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                          />
                        </label>
                        <label className="block text-sm font-semibold text-slate-700">
                          <span className="mb-1 block">Descripción</span>
                          <input
                            type="text"
                            value={sponsor.description}
                            onChange={(event) => updateSponsor(index, { description: event.target.value })}
                            placeholder="Descripción"
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                          />
                        </label>
                        <label className="block text-sm font-semibold text-slate-700">
                          <span className="mb-1 block">Orden</span>
                          <input
                            type="number"
                            value={sponsor.order}
                            onChange={(event) => updateSponsor(index, { order: Number(event.target.value) })}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                          />
                        </label>
                        <label className="flex items-end gap-2 pb-2 text-sm font-semibold text-slate-700">
                          <input
                            type="checkbox"
                            checked={sponsor.visible}
                            onChange={(event) => updateSponsor(index, { visible: event.target.checked })}
                          />
                          Visible
                        </label>
                        <button type="button" onClick={() => removeSponsor(index)} className="self-end rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-5">
                  <h2 className="text-lg font-semibold">Visibilidad y aviso</h2>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={settingsDraft.featureVisibility.sumateEnabled}
                        onChange={(event) =>
                          setSettingsDraft((current) => ({
                            ...current,
                            featureVisibility: { ...current.featureVisibility, sumateEnabled: event.target.checked },
                          }))
                        }
                      />
                      Formulario Sumate visible
                      <HelpIcon text="Activa o desactiva el formulario público /sumate. Si está apagado, los visitantes ven un mensaje indicando que el formulario no está disponible." />
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={settingsDraft.featureVisibility.sponsorsVisible}
                        onChange={(event) =>
                          setSettingsDraft((current) => ({
                            ...current,
                            featureVisibility: { ...current.featureVisibility, sponsorsVisible: event.target.checked },
                          }))
                        }
                      />
                      Sponsors visibles
                      <HelpIcon text="Controla si la sección pública de sponsors se muestra en la web. No borra sponsors; solo oculta o muestra la sección." />
                    </label>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={settingsDraft.homepageAnnouncement.enabled}
                        onChange={(event) =>
                          setSettingsDraft((current) => ({
                            ...current,
                            homepageAnnouncement: { ...current.homepageAnnouncement, enabled: event.target.checked },
                          }))
                        }
                      />
                      Aviso público activo
                      <HelpIcon text="Activa el modal público de la home. Sirve para campañas, avisos importantes, inscripciones, fixture, campeonatos o novedades temporales." />
                    </label>
                    <label className="block text-sm font-semibold text-slate-700">
                      <FieldTitle help="Título principal del modal público. Conviene usar una frase corta y clara, como 'Inscripciones abiertas' o 'Finales del Apertura'.">
                        Título del aviso
                      </FieldTitle>
                      <input
                        type="text"
                        value={settingsDraft.homepageAnnouncement.title}
                        onChange={(event) =>
                          setSettingsDraft((current) => ({
                            ...current,
                            homepageAnnouncement: { ...current.homepageAnnouncement, title: event.target.value },
                          }))
                        }
                        placeholder="Título del aviso"
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block text-sm font-semibold text-slate-700">
                      <FieldTitle help="Texto del modal público. Sirve para explicar la novedad con más detalle; se muestra debajo del título.">
                        Texto del aviso
                      </FieldTitle>
                      <textarea
                        value={settingsDraft.homepageAnnouncement.body}
                        onChange={(event) =>
                          setSettingsDraft((current) => ({
                            ...current,
                            homepageAnnouncement: { ...current.homepageAnnouncement, body: event.target.value },
                          }))
                        }
                        placeholder="Texto corto del aviso"
                        rows={3}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block text-sm font-semibold text-slate-700">
                      <FieldTitle help='Imagen opcional del modal. Puede ser una ruta pública como "/avisos/foto.jpg" o una URL completa. Se muestra completa, sin recortarse.'>
                        Imagen del aviso
                      </FieldTitle>
                      <input
                        type="text"
                        value={settingsDraft.homepageAnnouncement.imageUrl}
                        onChange={(event) =>
                          setSettingsDraft((current) => ({
                            ...current,
                            homepageAnnouncement: { ...current.homepageAnnouncement, imageUrl: event.target.value },
                          }))
                        }
                        placeholder="Imagen opcional: /avisos/temporada.jpg o https://..."
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="block text-sm font-semibold text-slate-700">
                        <FieldTitle help="Texto visible del botón principal del modal. Ejemplos: 'Ver más', 'Inscribirme', 'Ver fixture'.">
                          Texto del botón
                        </FieldTitle>
                        <input
                          type="text"
                          value={settingsDraft.homepageAnnouncement.ctaLabel}
                          onChange={(event) =>
                            setSettingsDraft((current) => ({
                              ...current,
                              homepageAnnouncement: { ...current.homepageAnnouncement, ctaLabel: event.target.value },
                            }))
                          }
                          placeholder="Texto del botón: Ver fixture"
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="block text-sm font-semibold text-slate-700">
                        <FieldTitle help='Destino del botón principal. Puede ser una ruta interna como "/games" o una URL externa completa con http/https.'>
                          Link del botón
                        </FieldTitle>
                        <input
                          type="text"
                          value={settingsDraft.homepageAnnouncement.ctaUrl}
                          onChange={(event) =>
                            setSettingsDraft((current) => ({
                              ...current,
                              homepageAnnouncement: { ...current.homepageAnnouncement, ctaUrl: event.target.value },
                            }))
                          }
                          placeholder="Link del botón: /games o https://..."
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        />
                      </label>
                    </div>
                  </div>
                </section>

                <button
                  type="submit"
                  disabled={busyKey === "settings-save"}
                  className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {busyKey === "settings-save" ? "Guardando..." : "Guardar configuración"}
                </button>
              </form>
            )}

            {activeTab === "system" && (
              <section className="space-y-6">
                <div className="grid gap-4 lg:grid-cols-2">
                  <section className="rounded-lg border border-slate-200 bg-white p-5">
                    <h2 className="text-lg font-semibold">Configuración sensible</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Diagnóstico de presencia sin mostrar nombres técnicos ni valores secretos.
                    </p>
                    <div className="mt-4 space-y-2">
                      {health?.checks.map((check) => (
                        <div key={check.id} className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-sm font-medium">{check.label}</span>
                          <StatusPill ok={check.ok} label={check.detail} />
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-lg border border-slate-200 bg-white p-5">
                    <h2 className="text-lg font-semibold">Crons y rutas</h2>
                    <div className="mt-4 space-y-2">
                      {health?.crons.map((cron) => (
                        <div key={`${cron.path}-${cron.schedule}-${cron.expected}`} className="border-b border-slate-100 pb-2">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold">{cron.label}</span>
                            <StatusPill ok={cron.ok} label={cron.ok ? "OK" : "Revisar"} />
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {cron.path} · {cron.schedule}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <section className="grid gap-6 lg:grid-cols-2">
                  <article className="rounded-lg border border-slate-200 bg-white p-5">
                    <h2 className="text-lg font-semibold">Crear juez</h2>
                    <form className="mt-4 space-y-3" onSubmit={handleCreateJudge}>
                      <input
                        type="text"
                        value={judgeForm.firstName}
                        onChange={(event) => setJudgeForm((current) => ({ ...current, firstName: event.target.value }))}
                        placeholder="Nombre"
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        value={judgeForm.lastName}
                        onChange={(event) => setJudgeForm((current) => ({ ...current, lastName: event.target.value }))}
                        placeholder="Apellido"
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />
                      <button
                        type="submit"
                        disabled={busyKey === "judge-create"}
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {busyKey === "judge-create" ? "Creando..." : "Crear juez"}
                      </button>
                    </form>
                    <div className="mt-4 max-h-64 overflow-auto rounded-md border border-slate-200">
                      {judges.map((judge) => (
                        <div key={judge._id} className="flex justify-between border-b border-slate-100 px-3 py-2 text-sm">
                          <span>{judge.firstName} {judge.lastName}</span>
                          <span className="text-slate-500">{judge.createdAt ? new Date(judge.createdAt).toLocaleDateString("es-UY") : "-"}</span>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="rounded-lg border border-slate-200 bg-white p-5">
                    <h2 className="text-lg font-semibold">Importación de jugadores</h2>
                    <p className="mt-1 text-sm text-slate-600">Ejecuta un dry-run seguro contra la planilla configurada.</p>
                    <button
                      type="button"
                      onClick={handleRunImportDryRun}
                      disabled={busyKey === "import-dry-run"}
                      className="mt-4 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {busyKey === "import-dry-run" ? "Ejecutando..." : "Ejecutar dry-run"}
                    </button>
                    {importResult ? (
                      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                        <p className="font-semibold">
                          Crear {importResult.created} · Actualizar {importResult.updated} · Omitir {importResult.skipped}
                        </p>
                        <p className="mt-1 text-slate-600">Ya migrados: {importResult.alreadyMigrated}</p>
                        {importResult.errors.length > 0 ? (
                          <div className="mt-3 max-h-36 overflow-auto text-xs text-red-700">
                            {importResult.errors.slice(0, 10).map((item) => (
                              <p key={`${item.rowNumber}-${item.email || ""}`}>
                                Fila {item.rowNumber}: {item.message}
                              </p>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                </section>
              </section>
            )}

            {activeTab === "audit" && (
              <section className="space-y-5">
                <div className="rounded-lg border border-slate-200 bg-white p-5">
                  <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                    <input
                      type="search"
                      value={auditFilters.actorEmail}
                      onChange={(event) => setAuditFilters((current) => ({ ...current, actorEmail: event.target.value }))}
                      placeholder="Email admin"
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      value={auditFilters.action}
                      onChange={(event) => setAuditFilters((current) => ({ ...current, action: event.target.value }))}
                      placeholder="Acción"
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      value={auditFilters.entityType}
                      onChange={(event) => setAuditFilters((current) => ({ ...current, entityType: event.target.value }))}
                      placeholder="Entidad"
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => fetchAuditLogs()}
                      className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Filtrar
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                  {auditLogs.length === 0 ? (
                    <p className="p-4 text-sm text-slate-500">Todavía no hay registros de auditoría.</p>
                  ) : (
                    auditLogs.map((log) => (
                      <article key={log.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_auto]">
                        <div>
                          <p className="font-semibold text-slate-950">{log.summary}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {log.actorEmail} · {log.action} · {log.entityType}
                          </p>
                          {log.entityLabel ? <p className="mt-1 text-xs text-slate-500">{log.entityLabel}</p> : null}
                        </div>
                        <p className="text-sm text-slate-500 lg:text-right">{formatDate(log.createdAt)}</p>
                      </article>
                    ))
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminProtection fallbackMessage="Solo los administradores pueden acceder al panel de administración.">
      <AdminPanelContent />
    </AdminProtection>
  );
}
