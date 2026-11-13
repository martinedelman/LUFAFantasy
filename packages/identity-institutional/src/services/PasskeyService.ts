import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import type { User } from "@lufa/sports/entities/User";
import type { IPasskeyRepository, IUserRepository, PasskeyRecord } from "../ports";
import { createSessionToken } from "../sessionToken";

export const PASSKEY_CHALLENGE_TTL_MS = 5 * 60 * 1000;
export const MAX_PASSKEYS_PER_USER = 10;
const MAX_PASSKEY_NAME_LENGTH = 60;

export interface PasskeyConfig {
  /** Dominio registrable al que quedan atadas las passkeys (p. ej. "lufa.com.uy"). */
  rpId: string;
  rpName: string;
  /** Orígenes desde los que el navegador puede usar las passkeys. */
  origins: string[];
  enabled: boolean;
}

export interface PasskeySummary {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  backedUp: boolean;
  deviceType: string;
}

export class PasskeyError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "PasskeyError";
  }
}

const INVALID_PASSKEY_MESSAGE = "No pudimos validar la passkey. Probá de nuevo o ingresá con tu contraseña.";

function toSummary(record: PasskeyRecord): PasskeySummary {
  return {
    id: record.id,
    name: record.name,
    createdAt: record.createdAt.toISOString(),
    lastUsedAt: record.lastUsedAt ? record.lastUsedAt.toISOString() : null,
    backedUp: record.backedUp,
    deviceType: record.deviceType,
  };
}

function normalizeName(name: unknown) {
  const value = typeof name === "string" ? name.replace(/\s+/g, " ").trim().slice(0, MAX_PASSKEY_NAME_LENGTH) : "";
  return value || "Passkey";
}

function transports(values: string[]) {
  return values as AuthenticatorTransportFuture[];
}

function isRegistrationResponse(value: unknown): value is RegistrationResponseJSON {
  const candidate = value as RegistrationResponseJSON | null;
  return Boolean(
    candidate &&
      typeof candidate.id === "string" &&
      candidate.type === "public-key" &&
      typeof candidate.response?.clientDataJSON === "string" &&
      typeof candidate.response?.attestationObject === "string",
  );
}

function isAuthenticationResponse(value: unknown): value is AuthenticationResponseJSON {
  const candidate = value as AuthenticationResponseJSON | null;
  return Boolean(
    candidate &&
      typeof candidate.id === "string" &&
      candidate.type === "public-key" &&
      typeof candidate.response?.clientDataJSON === "string" &&
      typeof candidate.response?.authenticatorData === "string" &&
      typeof candidate.response?.signature === "string",
  );
}

/**
 * Passkeys (WebAuthn) como forma alternativa de iniciar sesión.
 * La contraseña sigue existiendo: una passkey se agrega a una cuenta activa.
 */
export class PasskeyService {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly passkeys: IPasskeyRepository,
    private readonly getConfig: () => PasskeyConfig,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private config() {
    const config = this.getConfig();
    if (!config.enabled) {
      throw new PasskeyError("Las passkeys no están disponibles en este momento.", 503);
    }
    return config;
  }

  private challengeExpiry() {
    return new Date(this.now().getTime() + PASSKEY_CHALLENGE_TTL_MS);
  }

  private assertActive(user: User) {
    if (!user.id || !user.isActive) {
      throw new PasskeyError("Tu cuenta tiene que estar verificada para usar passkeys.", 403);
    }
    return user.id;
  }

  async listPasskeys(user: User): Promise<PasskeySummary[]> {
    this.config();
    const userId = this.assertActive(user);
    const records = await this.passkeys.listByUser(userId);
    return records.map(toSummary);
  }

  async removePasskey(user: User, passkeyId: string): Promise<void> {
    this.config();
    const userId = this.assertActive(user);
    const removed = await this.passkeys.delete(userId, passkeyId);
    if (!removed) throw new PasskeyError("No encontramos esa passkey.", 404);
  }

  async createRegistrationOptions(user: User): Promise<PublicKeyCredentialCreationOptionsJSON> {
    const config = this.config();
    const userId = this.assertActive(user);
    const existing = await this.passkeys.listByUser(userId);
    if (existing.length >= MAX_PASSKEYS_PER_USER) {
      throw new PasskeyError(`Podés tener hasta ${MAX_PASSKEYS_PER_USER} passkeys. Eliminá una para agregar otra.`, 400);
    }

    const options = await generateRegistrationOptions({
      rpName: config.rpName,
      rpID: config.rpId,
      userName: user.email,
      userDisplayName: user.name,
      userID: new TextEncoder().encode(userId),
      attestationType: "none",
      excludeCredentials: existing.map((record) => ({
        id: record.credentialId,
        transports: transports(record.transports),
      })),
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "required",
      },
    });

    await this.passkeys.saveChallenge({
      challenge: options.challenge,
      purpose: "registration",
      userId,
      expiresAt: this.challengeExpiry(),
    });
    return options;
  }

  async verifyRegistration(user: User, response: unknown, name?: unknown): Promise<PasskeySummary> {
    const config = this.config();
    const userId = this.assertActive(user);
    if (!isRegistrationResponse(response)) throw new PasskeyError("La respuesta de la passkey no es válida.", 400);

    let verification: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
    try {
      verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: (challenge) =>
          this.passkeys.consumeChallenge({ challenge, purpose: "registration", userId, now: this.now() }),
        expectedOrigin: config.origins,
        expectedRPID: config.rpId,
        requireUserVerification: true,
      });
    } catch {
      throw new PasskeyError("No pudimos registrar la passkey. Probá de nuevo.", 400);
    }

    if (!verification.verified) throw new PasskeyError("No pudimos registrar la passkey. Probá de nuevo.", 400);

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    if (await this.passkeys.findByCredentialId(credential.id)) {
      throw new PasskeyError("Esta passkey ya está registrada.", 409);
    }

    const record = await this.passkeys.create({
      userId,
      credentialId: credential.id,
      publicKey: credential.publicKey,
      counter: credential.counter,
      transports: credential.transports ?? response.response.transports ?? [],
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      name: normalizeName(name),
    });
    return toSummary(record);
  }

  async createAuthenticationOptions(): Promise<PublicKeyCredentialRequestOptionsJSON> {
    const config = this.config();
    // Sin allowCredentials: el navegador ofrece las passkeys guardadas (discoverable credentials).
    const options = await generateAuthenticationOptions({
      rpID: config.rpId,
      userVerification: "required",
    });
    await this.passkeys.saveChallenge({
      challenge: options.challenge,
      purpose: "authentication",
      expiresAt: this.challengeExpiry(),
    });
    return options;
  }

  async verifyAuthentication(response: unknown): Promise<{ user: User; token: string }> {
    const config = this.config();
    if (!isAuthenticationResponse(response)) throw new PasskeyError("La respuesta de la passkey no es válida.", 400);

    const record = await this.passkeys.findByCredentialId(response.id);
    if (!record) throw new PasskeyError(INVALID_PASSKEY_MESSAGE, 401);

    const user = await this.userRepo.findById(record.userId);
    if (!user || !user.id || !user.isActive) throw new PasskeyError(INVALID_PASSKEY_MESSAGE, 401);

    let verification: Awaited<ReturnType<typeof verifyAuthenticationResponse>>;
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: (challenge) =>
          this.passkeys.consumeChallenge({ challenge, purpose: "authentication", now: this.now() }),
        expectedOrigin: config.origins,
        expectedRPID: config.rpId,
        credential: {
          id: record.credentialId,
          publicKey: new Uint8Array(record.publicKey),
          counter: record.counter,
          transports: transports(record.transports),
        },
        requireUserVerification: true,
      });
    } catch {
      throw new PasskeyError(INVALID_PASSKEY_MESSAGE, 401);
    }

    if (!verification.verified) throw new PasskeyError(INVALID_PASSKEY_MESSAGE, 401);

    await this.passkeys.recordUse(record.id, verification.authenticationInfo.newCounter, this.now());

    const token = createSessionToken({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
    return { user, token };
  }
}
