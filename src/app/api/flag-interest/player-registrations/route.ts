import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/apiError";
import { getSessionTokenFromRequest } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import { FlagInterestModel } from "@/models";
import { AdminService, AuthService } from "@/services/backend";

const authService = new AuthService();
const adminService = new AdminService();
const allowedRoles = new Set(["admin", "entrenador_juveniles"]);

interface PlayerRegistrationDocument {
  _id: unknown;
  interestType: string;
  interestLabel: string;
  name: string;
  ageRange: string;
  location: string;
  whatsapp: string;
  whatsappDigits: string;
  experience?: string;
  createdAt: Date;
}

function toRegistrationResponse(doc: PlayerRegistrationDocument) {
  return {
    id: String(doc._id),
    interestType: doc.interestType,
    interestLabel: doc.interestLabel,
    name: doc.name,
    ageRange: doc.ageRange,
    location: doc.location,
    whatsapp: doc.whatsapp,
    whatsappDigits: doc.whatsappDigits,
    experience: doc.experience || "",
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const token = getSessionTokenFromRequest(request);

    if (!token) {
      return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    }

    const user = await authService.verifyToken(token);

    if (!allowedRoles.has(user.role)) {
      return NextResponse.json(
        {
          success: false,
          message: "No autorizado. Solo entrenadores juveniles o administradores pueden ver inscripciones.",
        },
        { status: 403 },
      );
    }

    await connectToDatabase();
    const docs = (await FlagInterestModel.find({ interestType: { $in: ["play", "child"] } })
      .sort({ createdAt: -1 })
      .limit(250)
      .lean()
      .exec()) as unknown as PlayerRegistrationDocument[];

    const settings = await adminService.getSiteSettings();

    return NextResponse.json({
      success: true,
      data: docs.map(toRegistrationResponse),
      settings: {
        whatsappMessageTemplate: settings.whatsappMessageTemplate,
      },
    });
  } catch (error) {
    return apiErrorResponse({
      request,
      error,
      message: "Error al obtener jugadores inscriptos",
      status: 500,
      route: "/api/flag-interest/player-registrations",
    });
  }
}
