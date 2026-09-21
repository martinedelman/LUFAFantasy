"use client";
import AdminProtection from "@/components/AdminProtection";
import AnalyticsWorkspace from "@/components/AnalyticsWorkspace";
export default function AnalyticsPage() { return <AdminProtection allowedRoles={["admin", "entrenador_juveniles", "redes"]} fallbackMessage="Solo Admin, Entrenador y Redes pueden acceder a estadísticas explorables."><AnalyticsWorkspace /></AdminProtection>; }
