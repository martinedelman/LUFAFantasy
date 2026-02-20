# Copilot Instructions - LUFA Fantasy

## Producto y alcance

- Este repo implementa gestión de liga de Flag Football.
- Alcance MVP: fixture + carga de puntos en vivo + asignación de anotación a jugador.
- No proponer ni implementar funcionalidades fuera de MVP salvo pedido explícito.

## Despues de modificar código

1. Ejecutar npm run lint
2. Ejecutar npm run build
3. Probar manualmente la funcionalidad modificada

## Estándares de código

- Usar TypeScript estricto y tipos existentes en `src/types` cuando aplique.
- Reutilizar modelos Mongoose en `src/models`.
- Validar datos de entrada en cada `route.ts`.
- Manejar errores con respuestas JSON consistentes (`success`, `message`, `data` cuando aplique).
- No introducir dependencias nuevas sin necesidad clara.

## API y datos

- Preferir operaciones atómicas y validaciones previas para evitar estados inconsistentes.
- Si se registra una anotación, debe quedar asociado el jugador y el partido de forma explícita.
- Mantener nombres de campos coherentes con modelos existentes.

## UI/UX

- Mantener interfaz simple para operaciones de torneo/fixture y score en vivo.
- Evitar rediseños o componentes no solicitados.
- Mantener la pagina en español y consistente con el estilo actual.

## Entorno

- Variable obligatoria actual: `MONGODB_URI`.
- Usar `.env.example` como fuente de verdad para nuevas variables.

## Qué evitar

- Refactors globales no solicitados.
- Cambios de naming extensivos.
- Features “nice to have” fuera del objetivo MVP.
