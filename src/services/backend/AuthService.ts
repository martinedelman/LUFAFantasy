import { User } from "../../entities/User";
import type { UserRole } from "../../entities/User";
import RepositoryContainer from "../../repositories";
import { verifySessionToken, createSessionToken } from "@/lib/auth";
import { EmailService } from "./EmailService";
import { OtpService } from "./OtpService";

/**
 * Servicio de autenticación
 * Maneja login, registro y verificación de usuarios
 */
export class AuthService {
  private userRepo = RepositoryContainer.getUserRepository();
  private emailService = new EmailService();
  private otpService = new OtpService();

  /**
   * Realiza login de un usuario
   */
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const user = await this.userRepo.findByEmail(email);

    if (!user) {
      throw new Error("Credenciales inválidas");
    }

    if (!user.isActive) {
      throw new Error("Usuario pendiente de verificación");
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error("Credenciales inválidas");
    }

    const token = createSessionToken({
      userId: user.id!,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    return { user, token };
  }

  /**
   * Registra un nuevo usuario
   */
  async register(data: { email: string; password: string; name: string; role?: UserRole }): Promise<User> {
    // Verificar que el email no esté en uso
    const existingUser = await this.userRepo.findByEmail(data.email);
    if (existingUser) {
      if (!existingUser.isActive) {
        await this.sendRegistrationVerification(existingUser);
        return existingUser;
      }

      throw new Error("El email ya está registrado");
    }

    // Hashear contraseña
    const passwordHash = await User.hashPassword(data.password);

    // Crear usuario
    const user = new User(data.email, passwordHash, data.name, data.role || "user", false);

    // Validar
    const validation = user.validate();
    if (!validation.isValid) {
      throw new Error(validation.errors.join(", "));
    }

    const createdUser = await this.userRepo.create(user);
    await this.sendRegistrationVerification(createdUser);

    return createdUser;
  }

  private async sendRegistrationVerification(user: User): Promise<void> {
    const otp = await this.otpService.createRegistrationOtp(user);

    await this.emailService.sendTemplate({
      name: "registration-verification",
      to: user.email,
      data: {
        name: user.name,
        verificationUrl: otp.verificationUrl,
        code: otp.code,
        expiresInMinutes: 15,
      },
    });
  }

  async verifyRegistration(data: { token: string; code: string }): Promise<{ user: User; token: string }> {
    const { user, sessionToken } = await this.otpService.verifyRegistrationOtp(data);
    return { user, token: sessionToken };
  }

  async requestPasswordReset(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userRepo.findByEmail(normalizedEmail);

    if (!user || !user.isActive) {
      return;
    }

    const otp = await this.otpService.createPasswordResetOtp(user);
    await this.emailService.sendTemplate({
      name: "password-reset",
      to: user.email,
      data: {
        name: user.name,
        code: otp.code,
        expiresInMinutes: otp.expiresInMinutes,
      },
    });
  }

  async resetPassword(data: { email: string; code: string; password: string }): Promise<void> {
    if (data.password.length < 6) {
      throw new Error("La contraseña debe tener al menos 6 caracteres");
    }

    const user = await this.otpService.verifyPasswordResetOtp({
      email: data.email,
      code: data.code,
    });
    const passwordHash = await User.hashPassword(data.password);
    await this.userRepo.updatePasswordHash(user.id!, passwordHash);
  }

  /**
   * Verifica un token y retorna el usuario
   */
  async verifyToken(token: string): Promise<User> {
    const payload = verifySessionToken(token);

    if (!payload) {
      throw new Error("Token inválido o expirado");
    }

    const user = await this.userRepo.findById(payload.userId);

    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    if (!user.isActive) {
      throw new Error("Usuario inactivo");
    }

    return user;
  }

  /**
   * Verifica si un usuario es administrador activo desde el token
   */
  async verifyAdmin(token: string): Promise<boolean> {
    try {
      const user = await this.verifyToken(token);
      return user.isAdmin() && user.isActive;
    } catch {
      return false;
    }
  }

  async verifyLiveMatchAccess(token: string): Promise<boolean> {
    try {
      const user = await this.verifyToken(token);
      return user.canUseLiveMatch();
    } catch {
      return false;
    }
  }

  /**
   * Obtiene un usuario por ID
   */
  async getUserById(id: string): Promise<User | null> {
    return await this.userRepo.findById(id);
  }
}
