# ADR 0001: monorepo y separación de identidad Fantasy

- Estado: aceptado
- Fecha: 2026-09-08

## Decisión

LUFA se organiza como un monorepo con tres unidades desplegables: web institucional, API y Fantasy. La API es la única unidad con acceso a persistencia. PostgreSQL es el provider oficial de testing; MongoDB queda disponible únicamente mediante configuración explícita para rollback.

La identidad institucional conserva `lufa_session`. Fantasy tiene su propio agregado de usuario, credenciales, endpoints bajo `/api/fantasy/v1` y cookie host-only `fantasy_session`. No hay SSO ni reutilización de sesiones entre ambos productos.

## Consecuencias

- Los frontends comparten contratos y cliente HTTP, no repositorios ni modelos.
- Los endpoints institucionales mantienen sus rutas y respuestas actuales.
- La primera entrega funcional de Fantasy incorpora schema y autenticación aislados bajo tablas `fantasy_*`.
- Cualquier futura funcionalidad Fantasy comenzará en un módulo de dominio propio.
