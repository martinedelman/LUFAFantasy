import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/apiError";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { safeTrack } from "@/lib/serverAnalytics";
import { EmailService } from "@/services/backend";

const emailService = new EmailService();

const interestLabels = {
  play: "Quiero jugar",
  child: "Quiero inscribir a mi hijo/a",
  team: "Quiero crear un equipo",
  coach: "Quiero ser entrenador",
  referee: "Quiero ser árbitro",
  sponsor: "Quiero sponsorear",
  school: "Soy una institución educativa",
  other: "Otro",
} as const;

const ageRanges = new Set(["Menor de 18", "18-24", "25-34", "35+"]);
const playerExperienceOptions = new Set(["Nunca jugué", "Jugué recreativamente", "Competí", "Soy entrenador", "Otro"]);
const sponsorInterestOptions = new Set([
  "Patrocinio económico",
  "Activaciones de marca",
  "Equipamiento",
  "Eventos",
  "No estoy seguro",
]);

interface FlagInterestRequestBody {
  interestType?: keyof typeof interestLabels;
  name?: string;
  ageRange?: string;
  location?: string;
  whatsapp?: string;
  experience?: string;
  company?: string;
  sponsorInterest?: string;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderLine(label: string, value: string) {
  return `<tr><th align="left" style="padding: 8px 12px; background: #f1f5f9; color: #334155;">${escapeHtml(
    label,
  )}</th><td style="padding: 8px 12px; color: #0f172a;">${escapeHtml(value)}</td></tr>`;
}

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(request, {
    key: "flag-interest",
    limit: 5,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetAt);
  }

  try {
    const body = (await request.json()) as FlagInterestRequestBody;
    const interestType = body.interestType;
    const interestLabel = interestType ? interestLabels[interestType] : undefined;
    const name = normalizeText(body.name);
    const ageRange = normalizeText(body.ageRange);
    const location = normalizeText(body.location);
    const whatsapp = normalizeText(body.whatsapp);
    const experience = normalizeText(body.experience);
    const company = normalizeText(body.company);
    const sponsorInterest = normalizeText(body.sponsorInterest);

    if (!interestType || !interestLabel) {
      return NextResponse.json({ success: false, message: "Seleccioná cómo querés participar." }, { status: 400 });
    }

    if (name.length < 2) {
      return NextResponse.json({ success: false, message: "Ingresá tu nombre." }, { status: 400 });
    }

    if (!ageRanges.has(ageRange)) {
      return NextResponse.json({ success: false, message: "Seleccioná un rango etario." }, { status: 400 });
    }

    if (location.length < 2) {
      return NextResponse.json({ success: false, message: "Seleccioná tu departamento o ciudad." }, { status: 400 });
    }

    if (whatsapp.replace(/\D/g, "").length < 8) {
      return NextResponse.json({ success: false, message: "Ingresá un WhatsApp válido." }, { status: 400 });
    }

    if (interestType === "play" && !playerExperienceOptions.has(experience)) {
      return NextResponse.json({ success: false, message: "Seleccioná tu experiencia previa." }, { status: 400 });
    }

    if (interestType === "sponsor") {
      if (company.length < 2) {
        return NextResponse.json({ success: false, message: "Ingresá el nombre de la empresa." }, { status: 400 });
      }

      if (!sponsorInterestOptions.has(sponsorInterest)) {
        return NextResponse.json(
          { success: false, message: "Seleccioná el tipo de colaboración que te interesa." },
          { status: 400 },
        );
      }
    }

    const rows = [
      renderLine("Interés", interestLabel),
      renderLine("Nombre", name),
      renderLine("Edad", ageRange),
      renderLine("Departamento o ciudad", location),
      renderLine("WhatsApp", whatsapp),
      ...(interestType === "play" ? [renderLine("Experiencia previa", experience)] : []),
      ...(interestType === "sponsor"
        ? [renderLine("Empresa", company), renderLine("Tipo de colaboración", sponsorInterest)]
        : []),
    ];

    await emailService.send({
      to: "lufaflag@gmail.com",
      subject: `[LUFA_FLAG_SUMATE] Nuevo interesado: ${interestLabel}`,
      text: [
        "Nuevo formulario de sumate a LUFA Flag",
        `Interés: ${interestLabel}`,
        `Nombre: ${name}`,
        `Edad: ${ageRange}`,
        `Departamento o ciudad: ${location}`,
        `WhatsApp: ${whatsapp}`,
        ...(interestType === "play" ? [`Experiencia previa: ${experience}`] : []),
        ...(interestType === "sponsor" ? [`Empresa: ${company}`, `Tipo de colaboración: ${sponsorInterest}`] : []),
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
          <h1 style="font-size: 22px; margin: 0 0 12px;">Nuevo formulario de sumate a LUFA Flag</h1>
          <p style="margin: 0 0 16px; color: #475569;">Asunto preparado para etiqueta de Gmail: <strong>[LUFA_FLAG_SUMATE]</strong></p>
          <table style="border-collapse: collapse; width: 100%; max-width: 680px; border: 1px solid #e2e8f0;">
            <tbody>${rows.join("")}</tbody>
          </table>
        </div>
      `,
    });

    await safeTrack("Flag interest submitted", {
      interestType,
      location,
    });

    return NextResponse.json({
      success: true,
      message: "Formulario enviado correctamente.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al enviar formulario";
    return apiErrorResponse({ request, error, message, status: 500, route: "/api/flag-interest" });
  }
}
