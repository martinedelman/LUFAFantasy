import { describe, expect, it } from "vitest";
import { credentialRoles, evaluateCredential, membershipCoverageEnd, type CredentialEvaluationInput } from "./digitalCredentialEvaluation";

const now = new Date("2026-11-10T12:00:00Z");
const day = 86_400_000;
const at = (offsetDays: number) => new Date(now.getTime() + offsetDays * day);

function input(overrides: Partial<CredentialEvaluationInput> = {}, credential: Partial<CredentialEvaluationInput["credential"]> = {}): CredentialEvaluationInput {
  return {
    credential: { status: "active", expiresAt: at(100), roles: ["player"], roleLabel: "Jugador", subjectType: "player", organizationName: "Snapshot FC", ...credential },
    member: { status: "active" },
    memberships: [{ status: "active", startsAt: at(-30), endsAt: at(60) }],
    certifications: [],
    coachTeams: [],
    player: { status: "active", team: { name: "Equipo Actual", status: "active" } },
    ...overrides,
  };
}

const roleStatus = (value: ReturnType<typeof evaluateCredential>, role: string) => value.roles.find((item) => item.role === role)?.status;

describe("evaluateCredential: jugador", () => {
  it("es válido con membresía paga, ficha aprobada y equipo activo, mostrando el equipo en vivo", () => {
    const result = evaluateCredential(input(), now);
    expect(result.status).toBe("active");
    expect(result.roles[0]).toMatchObject({ role: "player", status: "valid", teams: ["Equipo Actual"], validUntil: at(60).toISOString() });
    expect(result.organizationName).toBe("Equipo Actual");
  });

  it("sin membresía paga queda inactivo aunque la tarjeta esté vigente", () => {
    const result = evaluateCredential(input({ memberships: [] }), now);
    expect(result.status).toBe("inactive");
    expect(roleStatus(result, "player")).toBe("membership_required");
  });

  it("ignora membresías anuladas o vencidas", () => {
    const result = evaluateCredential(input({ memberships: [
      { status: "voided", startsAt: at(-10), endsAt: at(100) },
      { status: "active", startsAt: at(-400), endsAt: at(-1) },
    ] }), now);
    expect(roleStatus(result, "player")).toBe("membership_required");
  });

  it("encadena períodos contiguos para calcular hasta cuándo es válido", () => {
    expect(membershipCoverageEnd([
      { status: "active", startsAt: at(60), endsAt: at(240) },
      { status: "active", startsAt: at(-30), endsAt: at(60) },
    ], now)).toEqual(at(240));
    expect(membershipCoverageEnd([{ status: "active", startsAt: at(5), endsAt: at(30) }], now)).toBeNull();
  });

  it("una ficha preaprobada queda pendiente de aprobación", () => {
    expect(roleStatus(evaluateCredential(input({ player: { status: "pre_approved", team: { name: "X", status: "active" } } }), now), "player")).toBe("pending_approval");
  });

  it("una ficha inactiva o suspendida no habilita a jugar; lesionado sigue siendo parte del equipo", () => {
    for (const status of ["inactive", "suspended"]) {
      expect(roleStatus(evaluateCredential(input({ player: { status, team: { name: "X", status: "active" } } }), now), "player")).toBe("player_inactive");
    }
    expect(roleStatus(evaluateCredential(input({ player: { status: "injured", team: { name: "X", status: "active" } } }), now), "player")).toBe("valid");
    expect(roleStatus(evaluateCredential(input({ player: null }), now), "player")).toBe("player_inactive");
  });

  it("un equipo inactivo invalida el rol de jugador", () => {
    expect(roleStatus(evaluateCredential(input({ player: { status: "active", team: { name: "X", status: "suspended" } } }), now), "player")).toBe("team_inactive");
  });
});

describe("evaluateCredential: tarjeta y miembro", () => {
  it("una tarjeta revocada no es válida aunque la membresía esté paga", () => {
    const result = evaluateCredential(input({}, { status: "revoked" }), now);
    expect(result).toMatchObject({ status: "revoked", cardStatus: "revoked" });
  });

  it("una tarjeta vencida no es válida", () => {
    expect(evaluateCredential(input({}, { expiresAt: at(-1) }), now).status).toBe("expired");
  });

  it("un miembro suspendido queda suspendido aunque pague", () => {
    expect(evaluateCredential(input({ member: { status: "suspended" } }), now)).toMatchObject({ status: "suspended", memberStatus: "suspended" });
  });
});

describe("evaluateCredential: certificaciones", () => {
  const certification = { role: "judge", level: "2", issuer: "LUFA", status: "active", issuedAt: at(-100), expiresAt: at(100) };

  it("un juez certificado es válido aunque su rol de jugador esté impago", () => {
    const result = evaluateCredential(input({ memberships: [], certifications: [certification] }, { roles: ["player", "judge"] }), now);
    expect(result.status).toBe("active");
    expect(roleStatus(result, "player")).toBe("membership_required");
    expect(result.roles.find((role) => role.role === "judge")).toMatchObject({ status: "valid", level: "2", issuer: "LUFA" });
  });

  it("muestra el nivel más alto vigente", () => {
    const result = evaluateCredential(input({ certifications: [certification, { ...certification, level: "internacional" }, { ...certification, level: "1" }] }, { roles: ["judge"] }), now);
    expect(result.roles[0]?.level).toBe("internacional");
  });

  it("distingue certificación vencida, revocada y ausente", () => {
    expect(roleStatus(evaluateCredential(input({ certifications: [{ ...certification, expiresAt: at(-1) }] }, { roles: ["judge"] }), now), "judge")).toBe("certification_expired");
    expect(roleStatus(evaluateCredential(input({ certifications: [{ ...certification, status: "revoked" }] }, { roles: ["judge"] }), now), "judge")).toBe("certification_required");
    expect(roleStatus(evaluateCredential(input({ certifications: [] }, { roles: ["coach"] }), now), "coach")).toBe("certification_required");
  });

  it("el entrenador muestra solo los equipos activos que dirige", () => {
    const result = evaluateCredential(input({
      certifications: [{ ...certification, role: "coach" }],
      coachTeams: [
        { teamName: "Halcones", teamStatus: "active", active: true },
        { teamName: "Antiguo", teamStatus: "active", active: false },
        { teamName: "Disuelto", teamStatus: "inactive", active: true },
      ],
      player: null,
    }, { roles: ["coach"], organizationName: "LUFA" }), now);
    expect(result.roles[0]).toMatchObject({ role: "coach", status: "valid", teams: ["Halcones"] });
    expect(result.organizationName).toBe("Halcones");
  });
});

describe("credentialRoles", () => {
  it("deriva roles de etiquetas antiguas, ignora posiciones y respeta el orden", () => {
    expect(credentialRoles({ roles: [], roleLabel: "Entrenador · Jugador · C", subjectType: "player" })).toEqual(["player", "coach"]);
    expect(credentialRoles({ roles: [], roleLabel: "Árbitro", subjectType: "official" })).toEqual(["judge"]);
    expect(credentialRoles({ roles: [], roleLabel: "Oficial", subjectType: "official" })).toEqual(["judge"]);
    expect(credentialRoles({ roles: ["coach", "player"], roleLabel: "", subjectType: "player" })).toEqual(["player", "coach"]);
  });
});
