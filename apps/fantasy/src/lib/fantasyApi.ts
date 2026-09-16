export interface FantasyUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface ApiEnvelope<T> { success: boolean; data?: T; message?: string }

function safeStatusMessage(status: number) {
  if (status === 404) return "El servicio de Fantasy no está disponible. Verificá que la API esté iniciada.";
  if (status === 429) return "Demasiados intentos. Esperá un minuto y probá nuevamente.";
  if (status >= 500) return "No pudimos completar la operación. Probá nuevamente en unos segundos.";
  return "No pudimos completar la operación.";
}

async function apiEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) throw new Error(safeStatusMessage(response.status));
  try {
    const body = await response.json() as Partial<ApiEnvelope<T>>;
    if (typeof body.success !== "boolean") throw new Error();
    return body as ApiEnvelope<T>;
  } catch {
    throw new Error(safeStatusMessage(response.status));
  }
}

export async function fantasyRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/fantasy/v1${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await apiEnvelope<T>(response);
  if (!response.ok || !body.success) throw new Error(body.message || safeStatusMessage(response.status));
  if (body.data === undefined) throw new Error("La respuesta del servicio está incompleta.");
  return body.data;
}

export async function fantasyAction(path: string, init?: RequestInit): Promise<void> {
  const response = await fetch(`/api/fantasy/v1${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await apiEnvelope<never>(response);
  if (!response.ok || !body.success) throw new Error(body.message || safeStatusMessage(response.status));
}
