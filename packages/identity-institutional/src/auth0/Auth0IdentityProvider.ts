import { createRemoteJWKSet, jwtVerify } from "jose";
import type { ExternalIdentity, ExternalIdentityPort } from "../ports";

export class Auth0IdentityProvider implements ExternalIdentityPort {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(private readonly options: { domain: string; clientId: string }) {
    this.jwks = createRemoteJWKSet(new URL(`https://${options.domain}/.well-known/jwks.json`));
  }

  async verifyIdToken(idToken: string): Promise<ExternalIdentity> {
    const { payload } = await jwtVerify(idToken, this.jwks, {
      issuer: `https://${this.options.domain}/`,
      audience: this.options.clientId,
    });

    const subject = payload.sub;
    const email = payload.email ? String(payload.email).trim().toLowerCase() : "";

    if (!subject || !email) {
      throw new Error("Token de identidad inválido");
    }

    return {
      subject,
      email,
      emailVerified: payload.email_verified === true,
      name: typeof payload.name === "string" ? payload.name : undefined,
    };
  }
}
