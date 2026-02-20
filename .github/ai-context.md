# LUFA Fantasy - AI Context

## Objetivo del producto

LUFA Fantasy es una aplicación para gestionar una liga/campeonato de Flag Football y su capa de fantasy.

## Alcance MVP (prioridad actual)

1. Gestionar fixture completo del torneo:
   - torneos
   - divisiones
   - equipos
   - jugadores
   - partidos
2. Registrar puntos en vivo durante el partido.
3. Asignar cada anotación a un jugador.

## Fuera de alcance MVP (por ahora)

- Sistema fantasy completo para usuarios finales.
- Automatizaciones avanzadas de estadísticas históricas.
- Integraciones externas (notificaciones, redes, etc.).

## Stack técnico

- Next.js App Router
- TypeScript
- MongoDB + Mongoose
- Tailwind CSS

## Arquitectura funcional (resumen)

- Frontend y API en el mismo proyecto Next.js (`src/app`).
- Endpoints REST-like en `src/app/api/**/route.ts`.
- Modelos Mongoose en `src/models`.
- Conexión a base de datos en `src/lib/mongodb.ts`.
- Estado de auth actual en cliente (`src/hooks/useAuth.tsx`) con enfoque temporal para MVP.

## Variables de entorno actuales

- Requerida: `MONGODB_URI`.
- Archivo de referencia: `.env.example`.

## Reglas de negocio clave para IA

- Priorizar consistencia de datos entre partido, anotación y jugador.
- Evitar agregar features fuera del alcance MVP.
- Mantener cambios pequeños, trazables y orientados a entrega.
- Si hay ambigüedad funcional, elegir la opción más simple que permita anotar puntos en vivo y atribuirlos a jugadores.

## Convenciones recomendadas para contribuciones automáticas

- Validar input en API routes antes de escribir en DB.
- Reutilizar modelos/utilidades existentes antes de crear nuevos módulos.
- Evitar refactors masivos no solicitados.
- Actualizar documentación cuando cambie alcance o flujo de datos.
