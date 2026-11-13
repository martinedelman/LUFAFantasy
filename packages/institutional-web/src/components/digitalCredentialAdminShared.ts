import type {
  DigitalCredentialResponseDto, DigitalCredentialRole, DigitalCredentialRoleStatus, DigitalCredentialStatus, MembershipPaymentMethod,
} from "@lufa/contracts";

type Credential = DigitalCredentialResponseDto;
type ApiPayload<T> = { success?: boolean; data?: T; message?: string };

export const credentialApi = "/api/admin/digital-credentials";
export const panel = "space-y-4 rounded-lg border border-slate-200 bg-white p-5";
export const input = "w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-brand-700 disabled:bg-slate-100";
export const button = "rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand-700 disabled:opacity-50";
export const primaryButton = "rounded-md bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 disabled:opacity-50";
export const dangerButton = "rounded-md bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:opacity-50";

export const statusLabels: Record<DigitalCredentialStatus, string> = {
  active: "Vigente", inactive: "Sin habilitaciones vigentes", suspended: "Miembro suspendido", revoked: "Revocada", expired: "Vencida", not_found: "No encontrada",
};
export const statusExplanations: Record<DigitalCredentialStatus, string> = {
  active: "La tarjeta está vigente y al menos un rol está habilitado hoy. Al escanear el QR se ve como válida.",
  inactive: "La tarjeta está vigente, pero hoy no hay ningún rol habilitado: falta pagar la membresía, aprobar la ficha o certificar el rol.",
  suspended: "LUFA suspendió a este miembro. Ningún rol es válido y un pago no levanta la suspensión.",
  revoked: "La tarjeta fue revocada. Al escanear el QR aparece como no válida.",
  expired: "La tarjeta venció. Renovala para emitir una nueva para esta temporada.",
  not_found: "No encontramos la credencial.",
};
export const roleStatusLabels: Record<DigitalCredentialRoleStatus, string> = {
  valid: "Habilitado", membership_required: "Membresía pendiente", pending_approval: "Pendiente de aprobación", player_inactive: "Ficha inactiva",
  team_inactive: "Equipo inactivo", certification_required: "Sin certificación", certification_expired: "Certificación vencida",
};
export const roleStatusHelp: Record<DigitalCredentialRoleStatus, string> = {
  valid: "",
  membership_required: "Registrá un pago en la pestaña Membresía o esperá que pague en la tienda.",
  pending_approval: "La ficha está preaprobada: aprobala en la sección Jugadores.",
  player_inactive: "La ficha del jugador está inactiva, suspendida o no está vinculada.",
  team_inactive: "El equipo del jugador no está activo.",
  certification_required: "Otorgá una certificación en la pestaña Certificaciones.",
  certification_expired: "Renová la certificación en la pestaña Certificaciones.",
};
export const roleNames: Record<DigitalCredentialRole, string> = { player: "Jugador", judge: "Juez", coach: "Entrenador" };
export const methodLabels: Record<MembershipPaymentMethod, string> = { cash: "Efectivo", transfer: "Transferencia", team: "Cobrado por el equipo", other: "Otro" };
export const playerStatusLabels: Record<string, string> = {
  active: "Activa", injured: "Lesionado (activa)", pre_approved: "Preaprobada", inactive: "Inactiva", suspended: "Suspendida",
};
export const levelLabel = (level: string) => level === "internacional" ? "Internacional" : `Nivel ${level}`;
export const shortDate = (value: string | Date) => new Intl.DateTimeFormat("es-UY", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
export const dateTime = (value: string) => new Intl.DateTimeFormat("es-UY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
export const money = (minor: number) => `$${(minor / 100).toLocaleString("es-UY", { maximumFractionDigits: 2 })}`;
export const seasonEnd = () => `${new Date().getUTCFullYear() + 1}-02-28`;
export const today = () => new Date().toISOString().slice(0, 10);

export class RequestError extends Error {
  constructor(message: string, readonly credentials: Credential[]) {
    super(message);
  }
}

export async function credentialRequest<T>(path = "", init?: RequestInit): Promise<T> {
  const response = await fetch(`${credentialApi}${path}`, {
    cache: "no-store",
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const payload = await response.json().catch(() => ({})) as ApiPayload<T>;
  if (!response.ok || !payload.success) {
    const data = payload.data as { credentials?: Credential[] } | undefined;
    throw new RequestError(payload.message || "No pudimos completar la operación.", data?.credentials ?? []);
  }
  return payload.data as T;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "No pudimos completar la operación.";
}
