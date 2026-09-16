import { BaseApiClient } from "./BaseApiClient";
import type { User } from "@/types";

/**
 * Cliente API para operaciones de autenticación
 */
export class AuthApiClient extends BaseApiClient {
  constructor() {
    super("/api/auth");
  }

  /**
   * Realiza login de un usuario
   */
  async login(email: string, password: string): Promise<{ user: User }> {
    return this.post<{ user: User }>("/login", { email, password });
  }

  /**
   * Registra un nuevo usuario
   */
  async register(data: { email: string; password: string; name: string }): Promise<{ user: User }> {
    return this.post<{ user: User }>("/register", data);
  }

  /**
   * Obtiene el usuario actual (sesión)
   */
  async getCurrentUser(): Promise<{ user: User }> {
    return this.get<{ user: User }>("/me");
  }

  /**
   * Cierra la sesión del usuario
   */
  async logout(): Promise<void> {
    return this.post<void>("/logout");
  }
}

// Exportar instancia singleton
export const authApiClient = new AuthApiClient();
