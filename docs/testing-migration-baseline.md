# Línea base de migración de testing

- Rama de origen: `testing`
- Commit congelado: `dc68226fb1d90c21d6ee9f51efd9e02363b2f65c`
- Rama de trabajo: `codex/testing-monorepo-architecture`
- Proyecto Vercel monolítico conservado: `lufa-fantasy`
- Route Handlers heredados: 45
- Combinaciones método/path registradas: 63

El deployment monolítico existente no se modifica durante esta implementación. `scripts/check-api-parity.mjs` falla si desaparece o cambia sin registrar alguna combinación método/path de esta línea base.

Los archivos de schema y las dos migraciones Prisma se movieron sin cambios de contenido; sus checksums SHA-256 coinciden con el commit de origen. Por ello esta reestructuración no requiere una migración funcional ni un rollback de datos.
