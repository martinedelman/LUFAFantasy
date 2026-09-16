export interface ApiClientOptions {
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly fetchImplementation: typeof globalThis.fetch;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = (options.baseUrl || "/api").replace(/\/$/, "");
    this.fetchImplementation = options.fetch || globalThis.fetch;
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetchImplementation(`${this.baseUrl}/${path.replace(/^\//, "")}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...init.headers,
      },
    });

    const body = await response.json().catch(() => undefined) as
      | { success?: boolean; data?: T; message?: string }
      | T
      | undefined;

    if (!response.ok) {
      const message = body && typeof body === "object" && "message" in body
        ? String(body.message)
        : `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(message);
    }

    if (body && typeof body === "object" && "success" in body && "data" in body) {
      return body.data as T;
    }

    return body as T;
  }
}
