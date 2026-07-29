# LUFA Fantasy

Sistema de gestion para ligas de Flag Football construido con **Next.js** y **TypeScript**. La persistencia se puede ejecutar sobre **MongoDB/Mongoose** o **PostgreSQL/Prisma** mediante una variable de entorno, sin eliminar la implementacion Mongo existente.

## Documentacion Principal

- [Arquitectura del backend](docs/backend-architecture.md): capas, componentes, flujos de interaccion, endpoints, servicios, persistencia y guia para agregar features con clean code.
- [Propuesta LUFA Flag](docs/propuesta-lufa-flag.html): material comercial/institucional.
- [Sponsors 2026](docs/sponsors-2026/index.html): pagina estatica de sponsors.

## Stack

| Area | Tecnologia |
| --- | --- |
| Aplicacion | Next.js 15 App Router |
| UI | React 19, Tailwind CSS |
| Backend | Next.js Route Handlers |
| Lenguaje | TypeScript |
| Base de datos | MongoDB + Mongoose o PostgreSQL 15 + Prisma |
| Auth | JWT en cookie HTTP-only |
| Email | Nodemailer via SMTP |
| Storage | Vercel Blob |
| Deploy | Vercel |
| Integraciones | Google Sheets, Vercel Analytics, Vercel Flags |

## Funcionalidades

- Gestion de torneos, divisiones, equipos, jugadores y jueces.
- Programacion de partidos regulares, playoffs y finales.
- Live Match con eventos de partido, jugadores presentes, inicio, finalizacion y walkover.
- Tabla de posiciones viva para temporada regular con desempates IFAF.
- Rankings y estadisticas de jugadores/equipos.
- Registro, login, verificacion por OTP y reset de password.
- Panel admin para usuarios, settings, auditoria, intereses y health operativo.
- Correcciones de eventos enviadas por jueces y aprobadas/rechazadas por admin.
- Importacion idempotente de jugadores desde Google Sheets.
- Upload de imagenes a Vercel Blob.
- Crons para importacion y digest semanal.

## Arquitectura

El backend sigue una separacion por capas liviana:

```mermaid
flowchart LR
  Api["src/app/api\nRoute Handlers"] --> Services["src/services/backend\nCasos de uso"]
  Services --> Entities["src/entities\nDominio"]
  Services --> Repos["src/repositories\nContratos + selector de proveedor"]
  Repos --> MongoAdapters["MongoDB + Mongoose"]
  Repos --> PostgresAdapters["PostgreSQL + Prisma"]
  Api --> DTOs["src/app/DTOs\nRequests, responses, mappers"]
  Services --> External["SMTP, Google Sheets,\nVercel Blob, Analytics"]
```

Reglas rapidas para nuevas features:

- Mantener los handlers de `src/app/api` delgados.
- Poner reglas de negocio en `src/services/backend` o `src/entities`.
- Acceder a persistencia mediante repositorios, sin importar Mongoose o Prisma desde servicios y routes.
- Exponer respuestas mediante DTOs/mappers, no documentos Mongoose crudos.
- Invalidar cache tags cuando una mutacion afecte pantallas publicas.
- Auditar cambios admin sensibles.

La explicacion completa esta en [docs/backend-architecture.md](docs/backend-architecture.md).

## Estructura Del Proyecto

```text
src/
├── app/
│   ├── api/                 # Backend HTTP con Route Handlers
│   ├── DTOs/                # Requests, responses y mappers
│   └── */page.tsx           # Pantallas App Router
├── components/              # Componentes UI reutilizables
├── entities/                # Agregados y value objects del dominio
├── hooks/                   # Hooks React
├── generated/prisma/        # Cliente Prisma generado
├── lib/                     # Auth, proveedores de DB, cache, errores y utilidades
├── models/                  # Schemas Mongoose
├── repositories/            # Contratos e implementaciones MongoDB/PostgreSQL
├── services/
│   ├── backend/             # Casos de uso del backend
│   └── frontend/            # Clientes API y servicios UI
└── types/                   # Tipos compartidos

prisma/                      # Schema y migraciones PostgreSQL
scripts/                     # Tareas operativas y migracion de datos
docs/                        # Documentacion y artefactos
public/                      # Imagenes y assets publicos
```

## Requisitos

- Node.js 20.19 o superior (requisito de Prisma 7).
- npm.
- MongoDB local o remoto para el proveedor Mongo y como origen de migracion.
- PostgreSQL 15 para el proveedor Prisma.
- Docker para levantar ambas bases localmente.
- Cuenta/proyecto Vercel para deploy.
- Credenciales opcionales segun feature: SMTP, Vercel Blob, Google Sheets.

## Configuracion Local

1. Instalar dependencias:

```bash
npm install
```

2. Crear archivo de entorno:

```bash
cp .env.example .env
```

`.env` es local e ignorado por Git. Los scripts operativos del proyecto lo cargan
explícitamente; no guardar secretos reales en `.env.example`.

3. Levantar PostgreSQL local. Usa la imagen `postgres:15`, el contenedor
   `lufa-postgres` y el puerto `5434` para no interferir con otras instalaciones.
   El puerto se publica únicamente en `127.0.0.1`:

```bash
docker compose up -d postgres
```

Levantar MongoDB solo si se ejecutará el proveedor legado, una migración desde
MongoDB o una recuperación:

```bash
docker compose up -d mongodb
```

4. La configuración mínima para correr con PostgreSQL es:

```env
APP_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_PROVIDER=postgres
DATABASE_URL=postgresql://lufa:lufa_local@localhost:5434/lufa_fantasy?schema=public
DIRECT_URL=postgresql://lufa:lufa_local@localhost:5434/lufa_fantasy?schema=public
JWT_SECRET=<generar-con-openssl-rand-base64-32>
```

`MONGODB_URI` no es necesaria para ejecutar la aplicación con PostgreSQL. Solo
configurarla para los casos Mongo indicados arriba. Para conservar temporalmente
el comportamiento anterior, usar `DATABASE_PROVIDER=mongodb` y configurar
`MONGODB_URI`.

5. Preparar PostgreSQL cuando se use Prisma:

```bash
npm run prisma:generate
npm run db:postgres:migrate
```

6. Ejecutar en desarrollo:

```bash
npm run dev
```

La app queda disponible en `http://localhost:3000`.

## Variables De Entorno

La plantilla [.env.example](.env.example) agrupa todas las variables por función
y marca cuándo son necesarias. Usar `APP_ENV`; la clave en minúsculas
`environment` continúa soportada únicamente para despliegues anteriores. No
confundir `APP_ENV` con `NODE_ENV`, que es gestionada por Next.js.
`NEXT_PUBLIC_APP_URL` es la única URL que se debe configurar: `APP_URL` es un
fallback legado y `VERCEL_URL` lo inyecta Vercel automáticamente.

| Grupo | Variables | Cuándo configurarlas |
| --- | --- | --- |
| Runtime PostgreSQL | `APP_ENV`, `NEXT_PUBLIC_APP_URL`, `DATABASE_PROVIDER`, `DATABASE_URL`, `JWT_SECRET` | Siempre en la aplicación PostgreSQL. `DATABASE_URL` es la conexión del runtime; en Vercel debe usar el pooler transaccional. |
| Prisma CLI y migraciones | `DIRECT_URL` | Preferida por `prisma migrate` y por la migración Mongo→Postgres. En Supabase debe usar conexión directa si hay IPv6 o el pooler de sesión IPv4. Si falta, las herramientas usan `DATABASE_URL` por compatibilidad local. |
| Docker local | `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Al iniciar el contenedor. Deben coincidir con `DATABASE_URL` y `DIRECT_URL`; Docker no las actualiza automáticamente. |
| MongoDB legado | `MONGODB_URI`, `MONGODB_PORT` | Solo para el proveedor MongoDB, migración, rollback o sincronización desde Mongo. El origen de una migración se elige con `--source-db`. |
| Sesiones | `OTP_SECRET` | Opcional; si falta, los OTP usan `JWT_SECRET`. |
| Email | `MAIL_FROM`, `MAIL_PROVIDER`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | Para enviar email. En producción son indispensables `SMTP_HOST`, `SMTP_USER` y `SMTP_PASS`. |
| Media | `BLOB_READ_WRITE_TOKEN` | Solo para cargas de imágenes a Vercel Blob. |
| Feature flags | `FLAGS`, `FLAGS_SECRET` | Solo al habilitar Vercel Flags; vacías mantienen las flags desactivadas. |
| Crons | `CRON_SECRET` | Para autorizar las rutas cron. |
| Google Sheets | `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SHEETS_TAB_NAME`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` | Únicamente para importación de jugadores; se necesitan las cuatro. |

## Scripts

| Script | Descripcion |
| --- | --- |
| `npm run dev` | Inicia Next.js en desarrollo con Turbopack. |
| `npm run build` | Compila la app para produccion. |
| `npm start` | Sirve la build de produccion. |
| `npm run lint` | Ejecuta lint configurado en el proyecto. |
| `npm run prisma:generate` | Genera el cliente tipado de Prisma. |
| `npm run prisma:validate` | Valida el schema Prisma. |
| `npm run db:postgres:migrate` | Aplica las migraciones PostgreSQL pendientes. |
| `npm run db:postgres:dev` | Crea/aplica migraciones durante desarrollo. |
| `npm run test:postgres` | Prepara el schema aislado `integration` y prueba repositorios y migracion. |
| `npm run db:migrate:mongo-to-postgres -- --source-db=<db>` | Valida una migracion Mongo -> PostgreSQL sin escribir (dry-run). |
| `npm run db:migrate:mongo-to-postgres -- --source-db=<db> --apply` | Ejecuta la migracion idempotente y genera un reporte JSON. |
| `npm run seed` | Ejecuta seed con `.env`. |
| `npm run db:migrate-game-events` | Migra eventos de partidos. |
| `npm run db:sync-test-from-prod` | Sincroniza base de test desde produccion. |
| `npm run vercel:pull:testing` | Descarga env vars de Vercel Preview. |
| `npm run vercel:pull:prod` | Descarga env vars de Vercel Production. |
| `npm run deploy:testing` | Deploy manual a Vercel Preview. |
| `npm run deploy:prod` | Deploy manual a Vercel Production. |

La migracion no crea tablas separadas para `venues` ni `seasons`: la aplicacion usa
el venue embebido en cada partido y la temporada almacenada en cada torneo. Si esas
colecciones Mongo contienen documentos, el reporte los registra como omitidos.

La migracion crea un snapshot temporal por lotes, valida referencias y restricciones
unicas antes de escribir, ejecuta todos los upserts en una transaccion y compara
identidades, campos persistidos y relaciones al finalizar. Por defecto rechaza filas
ajenas en PostgreSQL para evitar falsos positivos; `--allow-extra-target` solo debe
usarse de forma consciente en entornos de prueba que comparten schema.

## Endpoints Principales

| Grupo | Rutas |
| --- | --- |
| Auth | `/api/auth/login`, `/api/auth/register`, `/api/auth/me`, `/api/auth/logout`, `/api/auth/verify-registration`, `/api/auth/password-reset/*` |
| Torneos | `/api/tournaments`, `/api/tournaments/[id]` |
| Divisiones | `/api/divisions` |
| Equipos | `/api/teams`, `/api/teams/[id]`, `/api/teams/[id]/players` |
| Jugadores | `/api/players`, `/api/players/[id]` |
| Partidos | `/api/games`, `/api/games/[id]`, `/api/games/[id]/start`, `/api/games/[id]/complete`, `/api/games/[id]/walkover`, `/api/games/[id]/events` |
| Estadisticas | `/api/dashboard`, `/api/standings`, `/api/rankings/players`, `/api/statistics/players`, `/api/statistics/teams` |
| Admin | `/api/admin/*` |
| Operativo | `/api/health`, `/api/media/upload`, `/api/cron/import-players`, `/api/cron/weekly-digest` |

El detalle metodo por metodo esta en [docs/backend-architecture.md](docs/backend-architecture.md#rutas-api).

## Deploy En Vercel

El proyecto soporta entornos paralelos:

- **Testing**: Vercel Preview, normalmente desde una rama `testing`.
- **Produccion**: Vercel Production, normalmente desde `main`.

Preparacion inicial:

```bash
npm i -g vercel
vercel login
vercel link
```

Configurar las variables requeridas en Preview y Production. Para la aplicación
PostgreSQL no agregar MongoDB salvo que ese entorno vaya a ejecutar una migración,
un rollback o el proveedor legado:

```bash
vercel env add APP_ENV preview
vercel env add APP_ENV production
vercel env add NEXT_PUBLIC_APP_URL preview
vercel env add NEXT_PUBLIC_APP_URL production
vercel env add DATABASE_PROVIDER preview
vercel env add DATABASE_PROVIDER production
vercel env add DATABASE_URL preview
vercel env add DATABASE_URL production
vercel env add DIRECT_URL preview
vercel env add DIRECT_URL production
vercel env add JWT_SECRET preview
vercel env add JWT_SECRET production
```

En el panel de Vercel se pega únicamente el valor de cada URL: no incluir el
nombre de la variable ni comillas. Las comillas de un archivo `.env` son sintaxis
de dotenv, pero en el panel pasarían a formar parte del secreto.

Agregar `MONGODB_URI` únicamente en los entornos que aún la necesiten. Las
credenciales de SMTP, Blob, crons, Google Sheets y flags se agregan solo si la
funcionalidad correspondiente estará habilitada.

Deploy manual:

```bash
npm run deploy:testing
npm run deploy:prod
```

Recomendacion operativa:

- Usar `testing` para previews estables.
- Usar `main` para produccion.
- Ejecutar `npm run db:postgres:migrate` contra PostgreSQL antes de cambiar `DATABASE_PROVIDER`.
- Ejecutar primero la migracion de datos en dry-run, revisar el reporte y recien despues repetir con `--apply`.
- Mantener `MONGODB_URI` durante la transicion y como fuente de rollback.

## Crons

El backend espera estos procesos programados:

| Ruta | Schedule | Funcion |
| --- | --- | --- |
| `/api/cron/import-players` | `0 6 * * *` | Importacion diaria de jugadores desde Google Sheets. |
| `/api/cron/weekly-digest` | `0 8 * * 1` | Digest semanal. |

Los endpoints cron deben recibir el secreto configurado en `CRON_SECRET`.

## Modelo De Dominio

Relaciones principales:

```text
Tournament (1) -> (N) Division
Tournament (1) -> (N) Team participante
Division (1) -> (N) Team
Team (1) -> (N) Player
Tournament + Division (1) -> (N) Game
Game (1) -> (N) GameEvent
Tournament + Division + Team (1) -> (1) Standing
User (1) -> roles y permisos
```

Agregados principales:

- `Tournament`: temporada, formato, criterios de playoff, divisiones y equipos participantes.
- `Division`: categoria competitiva.
- `Team`: equipo, coaches, colores, contacto e imagenes.
- `Player`: datos personales, equipo, posicion, camiseta y estado.
- `Game`: partido, estado, fase, jueces, score, eventos y jugadores presentes.
- `Standing`: tabla de posiciones, record, puntos, racha y desempates.
- `User`: identidad, roles, estado activo y permisos.

## Desarrollo De Nuevas Features

Checklist corto:

1. Definir el comportamiento de negocio.
2. Actualizar entidades/value objects si cambia el dominio.
3. Agregar o extender contratos de repositorio si se necesita persistencia.
4. Implementar ambos adapters cuando el contrato necesite nuevas operaciones.
5. Crear o extender un servicio backend.
6. Definir DTOs y mappers.
7. Agregar route handler.
8. Validar auth/permisos.
9. Usar `apiErrorResponse()` para errores.
10. Invalidar cache y registrar auditoria cuando aplique.

## Estado De Calidad

- El proyecto compila con TypeScript estricto.
- Hay tests de integracion de repositorios Prisma y de migracion idempotente Mongo -> PostgreSQL.
- Para cambios de persistencia, ejecutar `npm run test:postgres`, `npx tsc --noEmit` y builds con ambos proveedores.
- La documentacion profunda de arquitectura identifica deuda y zonas de riesgo en [docs/backend-architecture.md](docs/backend-architecture.md#estado-actual-y-deuda-arquitectonica).

## Autor

Proyecto personal para la gestion de LUFA Flag y practica de desarrollo full-stack con TypeScript.
