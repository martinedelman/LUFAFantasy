# Copilot Instructions - LUFA Fantasy

## Producto y alcance

- Este repo implementa gestión de liga de Flag Football.
- Alcance MVP: fixture + carga de puntos en vivo + asignación de anotación a jugador.
- No proponer ni implementar funcionalidades fuera de MVP salvo pedido explícito.

## Arquitectura

Este proyecto sigue **Clean Architecture** con separación clara de capas:

### Estructura de directorios

```
src/
├── entities/              # Domain Layer: Lógica de negocio pura
│   ├── base/              # Clases base: Entity, ValueObject, AggregateRoot
│   ├── valueObjects/      # Immutable objects: Venue, GameScore, etc.
│   ├── factories/         # Conversión entre capas
│   └── *.ts               # Entidades de dominio: User, Game, Team, etc.
├── repositories/          # Infrastructure Layer: Acceso a datos
│   ├── contracts/         # Interfaces (IRepository, IGameRepository, etc.)
│   ├── mongodb/           # Implementaciones MongoDB
│   └── index.ts           # DI Container (RepositoryContainer)
├── services/              # Application Layer: Casos de uso
│   ├── backend/           # Servicios de negocio: GameService, TeamService, etc.
│   └── frontend/          # Clientes API + helpers UI
├── app/api/               # Interface Layer: Controladores delgados
│   └── */route.ts         # Endpoints REST (validación → service → response)
└── models/                # Mongoose schemas (solo para MongoDB)
```

### Responsabilidades por capa

**1. Domain Layer (src/entities/)**

- Contiene lógica de negocio pura sin dependencias externas
- Entities: Clases con identidad y comportamiento (ej: `Game.calculateScore()`)
- Value Objects: Objetos inmutables sin identidad (ej: `GameScore`, `Venue`)
- No depende de base de datos, frameworks o librerías externas

**2. Infrastructure Layer (src/repositories/)**

- Implementa acceso a datos (MongoDB)
- Traduce entre dominio y persistencia usando Factories
- Nunca contiene lógica de negocio

**3. Application Layer (src/services/backend/)**

- Orquesta casos de uso coordinando entities y repositories
- Aplica reglas de negocio complejas que involucran múltiples entities
- Ejemplo: `GameService.completeGame()` actualiza game y recalcula standings

**4. Interface Layer (src/app/api/\*/route.ts)**

- Controladores REST delgados: validación → service → response
- No contienen lógica de negocio
- Usan Factories para convertir entre API y dominio

**5. Presentation Layer (src/services/frontend/)**

- API clients: Abstraen llamadas HTTP
- UI services: Helpers para formateo y validación en frontend

## Ejemplos de código

### ✅ CORRECTO: Usar entities con comportamiento

```typescript
// En GameService
const game = await this.gameRepository.findById(gameId);
game.updateScore(homeScore, awayScore); // Lógica en entity
await this.gameRepository.update(game);
```

### ❌ EVITAR: Lógica de negocio en services

```typescript
// NO hacer esto
const game = await this.gameRepository.findById(gameId);
game.homeScore = homeScore; // Mutación directa
game.awayScore = awayScore;
game.score.home = homeScore; // Duplicación de lógica
await this.gameRepository.update(game);
```

### ✅ CORRECTO: Usar repositories para acceso a datos

```typescript
// En GameService
const games = await this.gameRepository.findByTournament(tournamentId, filters);
```

### ❌ EVITAR: Acceso directo a modelos Mongoose

```typescript
// NO hacer esto en services o routes
const games = await GameModel.find({ tournament: tournamentId });
```

### ✅ CORRECTO: Routes delgados delegando a services

```typescript
// En src/app/api/games/route.ts
export async function POST(req: NextRequest) {
  const body = await req.json();

  // 1. Validación básica
  if (!body.tournament || !body.homeTeam || !body.awayTeam) {
    return NextResponse.json({ success: false, message: "Faltan campos" }, { status: 400 });
  }

  // 2. Llamar service
  const game = await gameService.createGame(body);

  // 3. Convertir y responder
  return NextResponse.json({
    success: true,
    data: GameFactory.toApiResponse(game),
  });
}
```

### ❌ EVITAR: Lógica de negocio en routes

```typescript
// NO hacer esto
export async function POST(req: NextRequest) {
  const body = await req.json();
  const tournament = await TournamentModel.findById(body.tournament);
  const homeTeam = await TeamModel.findById(body.homeTeam);
  const awayTeam = await TeamModel.findById(body.awayTeam);

  if (!tournament || !homeTeam || !awayTeam) {
    return NextResponse.json({ success: false }, { status: 404 });
  }

  // ... más validaciones y lógica de negocio aquí
}
```

## Factory Pattern

Cada entity tiene un Factory con 4 métodos de conversión:

```typescript
// 1. Crear entity desde documento MongoDB
GameFactory.fromDatabase(mongoDoc): Game

// 2. Convertir entity a formato MongoDB
GameFactory.toPersistence(game): MongoDoc

// 3. Crear entity desde request API
GameFactory.fromApiRequest(apiData): Game

// 4. Convertir entity a response API (IMPORTANTE: usar en routes)
GameFactory.toApiResponse(game): ApiResponse
```

**IMPORTANTE**: Siempre usar `Factory.toApiResponse()` en routes para evitar exponer internals de entities.

## Validación de datos

**Dónde validar:**

- **Routes**: Validación básica de estructura (campos required, tipos básicos)
- **Services**: Validación de reglas de negocio (ej: "equipo ya existe")
- **Entities**: Validación de invariantes de dominio (ej: "score no puede ser negativo")

**Cómo responder errores:**

```typescript
// Error de validación (400)
return NextResponse.json(
  {
    success: false,
    message: "Descripción del error",
  },
  { status: 400 },
);

// Error de negocio (404, 409, etc.)
return NextResponse.json(
  {
    success: false,
    message: "Recurso no encontrado",
  },
  { status: 404 },
);

// Error de servidor (500)
return NextResponse.json(
  {
    success: false,
    message: "Error interno",
  },
  { status: 500 },
);
```

## Después de modificar código

1. Ejecutar `npm run lint`
2. Ejecutar `npm run build`
3. Probar manualmente la funcionalidad modificada

## UI/UX

- Mantener interfaz simple para operaciones de torneo/fixture y score en vivo
- Evitar rediseños o componentes no solicitados
- Utilizar la paleta de colores en globals.css para mantener consistencia visual
- Mantener la página en español y consistente con el estilo actual

## Entorno

- Variable obligatoria actual: `MONGODB_URI`
- Usar `.env.example` como fuente de verdad para nuevas variables

## Qué evitar

### ❌ NO hacer:

1. **Acceso directo a modelos Mongoose**

   ```typescript
   // NO
   const game = await GameModel.findById(id);
   ```

   ✅ Usar repositories en su lugar

2. **Lógica de negocio en routes**

   ```typescript
   // NO poner validaciones complejas o cálculos en route.ts
   ```

   ✅ Delegar a services

3. **Mutación directa de entities**

   ```typescript
   // NO
   game.homeScore = 10;
   ```

   ✅ Usar métodos de entity: `game.updateScore(10, 5)`

4. **Mezclar capas**

   ```typescript
   // NO importar modelos en entities
   // NO importar repositories en routes
   ```

   ✅ Respetar flujo: Routes→Services→Repositories→Models

5. **Refactors globales no solicitados**
6. **Cambios de naming extensivos sin necesidad**
7. **Features "nice to have" fuera del objetivo MVP**
8. **Introducir dependencias nuevas sin necesidad clara**

## Dependencias y tecnologías

- Next.js 14 con App Router
- TypeScript estricto
- MongoDB + Mongoose (abstraído vía repositories)
- bcryptjs + JWT para autenticación
- Patrón Repository para abstracción de datos
- Dependency Injection via RepositoryContainer singleton
