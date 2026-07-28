# Resumen de implementación: MongoDB a PostgreSQL

## Objetivo

La aplicación ahora puede operar con PostgreSQL mediante Prisma, sin eliminar la
implementación MongoDB/Mongoose. La selección se realiza con
`DATABASE_PROVIDER`:

- `postgres`: usa los repositorios Prisma.
- `mongodb`: conserva los repositorios Mongoose existentes.

El valor debe declararse explícitamente en cada entorno. La configuración actual
de desarrollo usa PostgreSQL.

## Persistencia y esquema

- Se agregó el esquema Prisma, migraciones y cliente generado para PostgreSQL 15.
- Los repositorios de dominio para usuarios, torneos, divisiones, equipos,
  jugadores, partidos y posiciones tienen implementación Prisma junto a la
  implementación Mongo existente.
- Las relaciones históricas y las tablas de asociación se preservan: torneo ↔
  división, torneo ↔ equipo, división ↔ equipo, equipo ↔ jugador, participantes
  de partidos y eventos de partido.
- Los repositorios Prisma entregan las relaciones expandidas cuando la interfaz
  las necesita, igual que la implementación Mongo. Esto corrige la carga de
  Jugadores y de los perfiles de jugador con PostgreSQL.

## Módulos migrados fuera de los repositorios de dominio

También se trasladaron a PostgreSQL los accesos directos que no usaban los siete
repositorios principales:

- OTPs, auditoría administrativa, intereses y configuración del sitio.
- Jueces, importación de jugadores y correcciones de eventos.
- Dashboard, estadísticas de equipos/jugadores y rankings.
- Consultas de salud, reportes, cron de importación y digest semanal.
- Eventos, participantes, estadísticas y correcciones vinculadas a partidos.

Los servicios y rutas seleccionan el proveedor configurado, evitando que una
ruta activa con PostgreSQL vuelva a consultar MongoDB accidentalmente.

## Migración de datos

El comando operativo es:

```bash
npm run db:migrate:mongo-to-postgres -- --source-db <base_mongo> --apply
```

Antes de escribir, se recomienda ejecutar el mismo comando sin `--apply`. El
proceso toma un snapshot por lotes, valida referencias y restricciones únicas,
realiza upserts idempotentes y genera un reporte JSON. Conserva los IDs de Mongo
como IDs de PostgreSQL para mantener los enlaces y relaciones.

MongoDB se mantiene disponible como origen de migración y rollback mientras dure
la transición.

## Operación local

PostgreSQL se ejecuta en `lufa-postgres` a partir de `postgres:15`, expuesto
solo en `127.0.0.1:5434`:

```bash
docker compose up -d postgres
npm run prisma:generate
npm run db:postgres:migrate
```

La configuración mínima está documentada en `.env.example`. Para desarrollo se
usa `DATABASE_PROVIDER=postgres` y una `DATABASE_URL` con `schema=public`.

## Compatibilidad y ajustes de interfaz

- Se normalizaron referencias `id` y `_id` para que MongoDB y PostgreSQL se
  comporten igual en servicios, torneos, posiciones y correcciones.
- Se corrigió la invalidación de caché del navegador después de mutaciones para
  evitar datos obsoletos en equipos, posiciones y rankings.
- La pantalla de Jugadores y el perfil de jugador reciben equipo y división
  poblados desde Prisma, como ya ocurría con Mongoose.
- Rankings se ejecuta con consultas PostgreSQL agregadas sobre eventos de juego.

## Validación realizada

- TypeScript estricto: `npx tsc --noEmit`.
- Lint del proyecto: `npm run lint` (solo advertencias preexistentes).
- Validación Prisma: `node --env-file=.env ./node_modules/.bin/prisma validate`.
- Suite PostgreSQL: `npm test`, con 5 pruebas de integración aprobadas.
- Navegador local con PostgreSQL: creación y visualización de torneos, equipos,
  jugadores, partidos, Live Match, posiciones y rankings; además de las páginas
  de Jugadores y Rankings.

## Siguiente paso operativo

Antes de promover a producción, seguir la guía de
[variables de entorno Vercel](./vercel-variables-entorno-postgres.md), ejecutar
la migración primero en un entorno no productivo y conservar `MONGODB_URI`
durante la ventana de rollback acordada.
