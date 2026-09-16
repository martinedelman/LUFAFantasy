export interface ExternalIdentity {
  subject: string;
  email: string;
  emailVerified: boolean;
  name?: string;
}

export interface ExternalIdentityPort {
  verifyIdToken(idToken: string): Promise<ExternalIdentity>;
}
