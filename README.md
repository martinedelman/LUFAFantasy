# LUFA Platform

Monorepo de LUFA Flag con tres aplicaciones Next.js desplegables de forma independiente. La web institucional conserva el comportamiento público existente; Fantasy comienza como una aplicación aislada y pública; la API es la única aplicación que puede acceder a persistencia e integraciones privadas.

## Estructura

```text
apps/
├── institutional          # Web institucional
├── fantasy                # Producto Fantasy independiente (Huddle)
└── api                    # Route Handlers y composition root
packages/
├── fantasy-core           # Identidad y casos de uso propios de Fantasy
├── sports                 # Dominio y casos de uso deportivos
├── identity-institutional # Auth, OTP y sesión institucional
├── operations             # Admin, reporting, imports y digest
├── database               # Prisma, Mongoose y repositorios
├── integrations           # SMTP, Blob y servicios externos
├── contracts              # DTOs públicos
└── api-client             # Cliente HTTP isomórfico
```

La dirección permitida es:

```text
Frontend → contracts/api-client
API → application modules + infrastructure
Application → domain + ports
Infrastructure → implements ports
Domain → sin dependencias de framework o persistencia
```

Las reglas ejecutables están en `scripts/check-architecture-boundaries.mjs`. La línea base de los 45 Route Handlers y sus 63 combinaciones método/path está protegida por `scripts/check-api-parity.mjs`.

## Requisitos

- Node.js 22 o superior.
- npm 10.
- PostgreSQL para el entorno oficial de testing.
- MongoDB sólo si se selecciona manualmente como fallback.

## Desarrollo local

```bash
npm install
cp apps/api/.env.example apps/api/.env.local
cp apps/institutional/.env.example apps/institutional/.env.local
cp apps/fantasy/.env.example apps/fantasy/.env.local
npm run prisma:generate
npm run dev
```

Puertos por defecto:

- Institutional: `http://localhost:3000`
- API: `http://localhost:3001`
- Fantasy: `http://localhost:3002`

Institutional continúa solicitando `/api/*`; su rewrite usa `API_URL` para dirigir esas llamadas a la API independiente. La cookie institucional continúa siendo `lufa_session`, HTTP-only y host-only. Fantasy consume `/api/fantasy/v1/*` mediante su propio rewrite y usa la cookie host-only `fantasy_session`; no comparte usuarios ni sesión con Institutional.

## Configuración

Cada aplicación documenta únicamente sus variables en su propio `.env.example`:

- `apps/api/.env.example`: base de datos, secretos, SMTP e integraciones.
- `apps/institutional/.env.example`: `APP_URL`, `API_URL` y flags.
- `apps/fantasy/.env.example`: entorno, URL pública y `API_URL` para el rewrite privado.

En `APP_ENV=testing`, PostgreSQL es el provider predeterminado. MongoDB no se activa ante errores de PostgreSQL: requiere `DATABASE_PROVIDER=mongodb`, `MONGODB_URI` y `MONGODB_DATABASE` explícitos.

## Comandos

| Comando | Propósito |
| --- | --- |
| `npm run dev` | Ejecuta los tres workspaces en paralelo. |
| `npm run dev:institutional` | Ejecuta sólo la web institucional. |
| `npm run dev:api` | Ejecuta sólo la API. |
| `npm run dev:fantasy` | Ejecuta sólo Fantasy. |
| `npm run lint` | Lint de todos los workspaces. |
| `npm run typecheck` | Typecheck de todos los workspaces. |
| `npm test` | Tests unitarios y de aplicación. |
| `npm run test:postgres` | Integración de repositorios contra PostgreSQL. |
| `npm run prisma:validate` | Valida el schema conservado. |
| `npm run check:boundaries` | Valida dependencias entre capas. |
| `npm run check:api-parity` | Detecta cambios en la superficie HTTP heredada. |
| `npm run build` | Compila las tres aplicaciones independientemente. |
| `npm run check` | Ejecuta todas las verificaciones locales. |

## Testing y despliegue

La CI de PRs hacia `testing` instala con `npm ci`, genera y valida Prisma, verifica límites y paridad de API, ejecuta lint/typecheck/tests, compila las tres aplicaciones y prueba repositorios contra PostgreSQL 17 efímero.

Los proyectos de testing previstos son:

| Proyecto | Root Directory |
| --- | --- |
| `lufa-api-testing` | `apps/api` |
| `lufa-institutional-testing` | `apps/institutional` |
| `lufa-fantasy-testing` | `apps/fantasy` |

El orden de promoción es API → Institutional → Fantasy. La rama de producción no se migra ni se despliega como parte de esta reestructuración.

## Decisiones

- [ADR 0001: monorepo e identidad Fantasy](docs/adr/0001-monorepo-and-fantasy-identity.md)
- [Arquitectura del monorepo](docs/monorepo-architecture.md)
- [Línea base y rollback de testing](docs/testing-migration-baseline.md)
- [Arquitectura histórica del backend](docs/backend-architecture.md)
