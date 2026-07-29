# Variables de entorno en Vercel para PostgreSQL

Esta guía indica qué cambiar en Vercel al operar LUFA con PostgreSQL y Prisma.
Los valores sensibles se deben cargar desde el panel de Vercel como secretos; no
deben vivir en el repositorio ni en variables `NEXT_PUBLIC_*`.

## Cambios obligatorios

Configurar estas variables tanto en **Preview** como en **Production**, usando
valores independientes para cada entorno cuando corresponda:

| Variable | Preview | Production | Sensible | Nota |
| --- | --- | --- | --- | --- |
| `APP_ENV` | `development` | `production` | No | Entorno funcional de LUFA. No usar la clave antigua `environment` en configuraciones nuevas. |
| `NEXT_PUBLIC_APP_URL` | URL pública de Preview | `https://flag.lufa.com.uy` (o la URL final) | No | Única URL que se configura manualmente. Se expone al navegador. |
| `DATABASE_PROVIDER` | `postgres` | `postgres` | No | Selecciona Prisma como proveedor activo. |
| `DATABASE_URL` | Pooler transaccional de Preview | Pooler transaccional de Production | Sí | Conexión del runtime serverless. En Supabase usa el puerto `6543` y `pgbouncer=true`. |
| `DIRECT_URL` | Conexión de sesión de Preview | Conexión de sesión de Production | Sí | Preferida por Prisma CLI y los scripts de migración. En Supabase usa conexión directa si existe IPv6 o el pooler de sesión IPv4 en `5432`. |
| `JWT_SECRET` | Valor aleatorio propio | Valor aleatorio propio | Sí | Generar uno distinto por entorno con `openssl rand -base64 32`. |

No configurar `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`,
`POSTGRES_DB` ni `MONGODB_PORT` en Vercel: se usan únicamente para Docker local.

## URLs de Supabase

Para Vercel y otros runtimes serverless:

```dotenv
DATABASE_URL="postgresql://postgres.<project-ref>:<password-percent-encoded>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require&schema=public"
```

Para Prisma CLI y los scripts de migración:

```dotenv
DIRECT_URL="postgresql://postgres.<project-ref>:<password-percent-encoded>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require&schema=public"
```

Codificar una sola vez únicamente la contraseña, no la URL completa. En archivos
`.env` las comillas son sintaxis válida. En el campo **Value** de Vercel se debe
pegar solo la URL, sin comillas y sin el prefijo `DATABASE_URL=` o `DIRECT_URL=`.

## MongoDB durante la transición

`MONGODB_URI` **no es necesaria** para ejecutar la aplicación con
`DATABASE_PROVIDER=postgres`.

Mantenerla temporalmente en Preview y Production solo si se necesita una de estas
capacidades:

- rollback rápido cambiando temporalmente a `DATABASE_PROVIDER=mongodb`;
- scripts operativos que lean MongoDB desde ese entorno;
- validación de migración que se ejecute con credenciales de Vercel.

Una vez finalizada la ventana de rollback y retirados esos procesos, eliminar
`MONGODB_URI` de Vercel. La implementación Mongo sigue en el código, pero no
debe ser una dependencia de la operación normal PostgreSQL.

## Variables opcionales por funcionalidad

Agregar solo las que correspondan a funcionalidades habilitadas:

| Funcionalidad | Variables | Sensibles |
| --- | --- | --- |
| OTP con pepper propio | `OTP_SECRET` | Sí. Si falta, se usa `JWT_SECRET`; en producción se recomienda definirlo por separado. |
| Envío de email | `MAIL_FROM`, `MAIL_PROVIDER`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | `SMTP_USER` y `SMTP_PASS`. |
| Carga de imágenes | `BLOB_READ_WRITE_TOKEN` | Sí. |
| Endpoints cron | `CRON_SECRET` | Sí. Debe coincidir con el header `Authorization: Bearer …` de quien invoque el cron. |
| Importación desde Google Sheets | `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SHEETS_TAB_NAME`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` | `GOOGLE_PRIVATE_KEY`; las cuatro se requieren juntas. |
| Vercel Flags | `FLAGS`, `FLAGS_SECRET` | `FLAGS_SECRET`; preferir el aprovisionamiento automático de Vercel. |

`APP_URL` es un fallback de compatibilidad y `VERCEL_URL` es inyectada por
Vercel. No agregar ninguna de las dos en configuraciones nuevas:
usar siempre `NEXT_PUBLIC_APP_URL`.

## Secuencia recomendada de despliegue

1. Crear o confirmar una instancia PostgreSQL exclusiva para Preview y otra para
   Production. No reutilizar la base productiva en Preview.
2. Cargar `DATABASE_URL`, `DIRECT_URL` y las demás variables obligatorias en
   Vercel. Limitar ambas al entorno y, para Preview, a la rama correspondiente.
3. Aplicar las migraciones Prisma contra la base correspondiente:

   ```bash
   npm run db:postgres:migrate
   ```

4. Ejecutar la migración de datos desde un entorno seguro con acceso a ambas
   bases. Primero dry-run y luego aplicación real:

   ```bash
   npm run db:migrate:mongo-to-postgres -- --source-db <origen>
   npm run db:migrate:mongo-to-postgres -- --source-db <origen> --apply
   ```

5. Desplegar Preview con `DATABASE_PROVIDER=postgres`, ejecutar pruebas
   funcionales y validar rankings, estadísticas y Live Match.
6. Repetir el proceso en Production durante una ventana controlada. Conservar
   `MONGODB_URI` mientras exista el plan de rollback.
7. Tras cerrar la ventana de rollback, retirar los secretos Mongo que ya no sean
   necesarios y revisar permisos de las credenciales restantes.

## Checklist de seguridad

- Marcar como secretos: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `OTP_SECRET`,
  `SMTP_PASS`, `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`, `GOOGLE_PRIVATE_KEY`,
  `FLAGS_SECRET` y, si se conserva, `MONGODB_URI`.
- Usar secretos diferentes en Preview y Production.
- No usar secretos bajo el prefijo `NEXT_PUBLIC_`.
- Rotar `JWT_SECRET` y `OTP_SECRET` de manera coordinada: al rotarlos se
  invalidarán sesiones y OTPs en curso.
- Limitar `DATABASE_URL` y `DIRECT_URL` de Preview a una base sin datos
  productivos y con permisos mínimos.
