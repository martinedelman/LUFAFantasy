import { normalizeEmail, normalizeOptionalText } from "@/lib/normalize";
import type { Team } from "@/entities/Team";
import type { UserRole } from "@/entities/User";

export function getTeamCoachEmails(team: Team): string[] {
  const coaches = team.coaches && team.coaches.length > 0 ? team.coaches : team.coach ? [team.coach] : [];
  return coaches.map((coach) => normalizeEmail(coach?.email)).filter(Boolean);
}

export function canUserEditTeam(user: { email: string; role: UserRole }, team: Team): boolean {
  const userEmail = normalizeEmail(user.email);

  return (
    user.role === "admin" ||
    userEmail === normalizeEmail(team.contact?.email) ||
    getTeamCoachEmails(team).includes(userEmail)
  );
}

interface ContactInput {
  email?: string;
  phone?: string;
  address?: string;
  socialMedia?: {
    facebook?: string | null;
    instagram?: string | null;
    x?: string | null;
    twitter?: string | null;
  };
}

interface SanitizedContact {
  email?: string;
  phone?: string;
  address?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    x?: string;
    twitter?: string;
  };
}

export function sanitizeContact(contact: ContactInput): SanitizedContact;
export function sanitizeContact(contact: ContactInput | undefined): SanitizedContact | undefined;
export function sanitizeContact(contact: ContactInput | undefined): SanitizedContact | undefined {
  if (!contact) return undefined;

  return {
    email: normalizeOptionalText(contact.email),
    phone: normalizeOptionalText(contact.phone),
    address: normalizeOptionalText(contact.address),
    socialMedia: contact.socialMedia
      ? {
          facebook: normalizeOptionalText(contact.socialMedia.facebook),
          instagram: normalizeOptionalText(contact.socialMedia.instagram),
          x: normalizeOptionalText(contact.socialMedia.x ?? contact.socialMedia.twitter),
          twitter: normalizeOptionalText(contact.socialMedia.twitter),
        }
      : undefined,
  };
}
