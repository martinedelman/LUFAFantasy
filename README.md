# 🏈 LUFA Fantasy - Sistema de Gestión de Flag Football

Un sistema completo de gestión para ligas de Flag Football desarrollado con **Next.js**, **TypeScript** y **MongoDB**.

## 📋 Descripción del Proyecto

Este proyecto está diseñado para replicar y mejorar funcionalidades de páginas como CópaFácil, proporcionando una plataforma integral para la gestión de torneos, equipos, jugadores y estadísticas de Flag Football.

## 🏗️ Arquitectura del Sistema

### Entidades Principales

El sistema maneja las siguientes entidades principales:

#### 1. **Torneos (Tournaments)**

- Gestión de competiciones principales (ej: "APERTURA FLAG 2025")
- Configuración de reglas de juego
- Sistema de puntuación personalizable
- Premios y reconocimientos

#### 2. **Divisiones (Divisions)**

- Categorías por género (masculino, femenino, mixto)
- Grupos de edad
- Límites de equipos por división

#### 3. **Equipos (Teams)**

- Información completa del equipo
- Datos del entrenador
- Colores y logo del equipo
- Información de contacto

#### 4. **Jugadores (Players)**

- Datos personales y de contacto
- Posiciones específicas de Flag Football (QB, WR, RB, etc.)
- Información médica y de emergencia
- Número de jersey único por equipo

#### 5. **Partidos (Games)**

- Programación de encuentros
- Registro de puntuaciones por cuartos
- Estadísticas detalladas del juego
- Eventos del partido (touchdowns, intercepciones, etc.)
- Información de oficiales y condiciones climáticas

#### 6. **Estadísticas de Jugadores (PlayerStatistics)**

- **Ofensivas**: Pases, carrera, recepciones
- **Defensivas**: Tacleadas, intercepciones, sacks
- **Especiales**: Pateo, punting, retornos

#### 7. **Estadísticas de Equipos (TeamStatistics)**

- Record de victorias/derrotas
- Puntos a favor y en contra
- Estadísticas ofensivas y defensivas
- Eficiencia en terceras oportunidades y zona roja

#### 8. **Tabla de Posiciones (Standings)**

- Clasificación por división
- Porcentaje de victorias
- Diferencial de puntos
- Records en casa/visitante

#### 9. **Campos de Juego (Venues)**

- Ubicación y capacidad
- Instalaciones disponibles
- Horarios de disponibilidad
- Información de contacto

#### 10. **Temporadas (Seasons)**

- Agrupación de torneos por año
- Fechas de inicio y fin
- Estado de la temporada

## 🛠️ Tecnologías Utilizadas

- **Frontend**: Next.js 15 con React 19
- **Backend**: Next.js API Routes
- **Base de Datos**: MongoDB con Mongoose
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS
- **Herramientas**: ESLint, PostCSS

## 📁 Estructura del Proyecto

```
src/
├── app/                    # App Router de Next.js
│   ├── page.tsx           # Página principal (Dashboard)
│   ├── layout.tsx         # Layout principal
│   └── globals.css        # Estilos globales
├── lib/                   # Librerías y utilitarios
│   ├── mongodb.ts         # Configuración de MongoDB
│   └── statistics.ts      # Utilitarios de estadísticas
├── models/                # Modelos de MongoDB
│   ├── Tournament.ts      # Modelo de torneos
│   ├── Division.ts        # Modelo de divisiones
│   ├── Team.ts           # Modelo de equipos
│   ├── Player.ts         # Modelo de jugadores
│   ├── Game.ts           # Modelo de partidos
│   ├── PlayerStatistics.ts # Estadísticas de jugadores
│   ├── TeamStatistics.ts  # Estadísticas de equipos
│   ├── Standing.ts        # Tabla de posiciones
│   ├── Venue.ts          # Campos de juego
│   ├── Season.ts         # Temporadas
│   └── index.ts          # Exportaciones
└── types/                # Definiciones de tipos
    └── index.ts          # Tipos TypeScript
```

## 🎯 Características Específicas de Flag Football

### Posiciones de Jugadores

- **QB** (Quarterback): Lanza los pases
- **WR** (Wide Receiver): Recibe pases
- **RB** (Running Back): Corre con el balón
- **C** (Center): Centra el balón
- **G** (Guard): Línea ofensiva
- **T** (Tackle): Línea ofensiva
- **DE** (Defensive End): Línea defensiva
- **DT** (Defensive Tackle): Línea defensiva
- **LB** (Linebacker): Defensa media
- **CB** (Cornerback): Defensa secundaria
- **FS** (Free Safety): Seguridad libre
- **SS** (Strong Safety): Seguridad fuerte
- **K** (Kicker): Pateador
- **P** (Punter): Despejador
- **FLEX**: Posición flexible

### Sistema de Puntuación

- **Touchdown**: 6 puntos
- **Extra Point 1 yarda**: 1 punto
- **Extra Point 5 yardas**: 2 puntos
- **Extra Point 10 yardas**: 3 puntos
- **Safety**: 2 puntos
- **Field Goal**: 3 puntos (opcional)

### Estadísticas Detalladas

#### Ofensivas

- Pases completados/intentados
- Yardas por pase y carrera
- Touchdowns ofensivos
- Intercepciones lanzadas
- Recepciones y yardas recibidas

#### Defensivas

- Tacleadas y tacleadas asistidas
- Sacks al quarterback
- Intercepciones defensivas
- Pases defendidos
- Fumbles forzados y recuperados
- Touchdowns defensivos

## 🔧 Configuración del Proyecto

### Requisitos Previos

- Node.js 18+
- MongoDB (local o en la nube)
- npm o yarn

### Instalación

1. **Clonar el repositorio**

```bash
git clone <repository-url>
cd lufa_fantasy
```

2. **Instalar dependencias**

```bash
npm install
```

3. **Configurar variables de entorno**

```bash
cp .env.example .env.local
```

Editar `.env.local` con tus configuraciones:

```env
MONGODB_URI=mongodb://localhost:27017/lufa_fantasy

# Opcionales (no usados en el MVP actual)
# NEXTAUTH_URL=http://localhost:3000
# NEXTAUTH_SECRET=change-me
```

4. **Ejecutar en desarrollo**

```bash
npm run dev
```

5. **Compilar para producción**

```bash
npm run build
npm start
```

## ▲ Deploy en Vercel (Testing + Prod en paralelo)

Este proyecto puede usar un solo proyecto de Vercel con 2 entornos activos al mismo tiempo:

- **Testing**: entorno **Preview** (ej: branch `testing`)
- **Prod**: entorno **Production** (ej: branch `main`)

### 1) Preparar Vercel CLI y link del proyecto

```bash
npm i -g vercel
vercel login
vercel link
```

### 2) Configurar variables de entorno en ambos entornos

Variables requeridas por esta app:

- `MONGODB_URI`
- `JWT_SECRET`

Opcional:

- **Vercel Feature Flags**: `FLAGS` (y `FLAGS_SECRET` opcional; la app lo deriva si no está definido).

Configúralas en Preview y Production:

```bash
vercel env add MONGODB_URI preview
vercel env add MONGODB_URI production
vercel env add JWT_SECRET preview
vercel env add JWT_SECRET production
```

### 3) Deploy manual en paralelo

Puedes lanzar ambos deploys desde 2 terminales distintas:

```bash
# Terminal 1 - testing (preview)
npm run deploy:testing

# Terminal 2 - producción
npm run deploy:prod
```

Scripts disponibles en `package.json`:

- `npm run deploy:testing`
- `npm run deploy:prod`
- `npm run vercel:pull:testing`
- `npm run vercel:pull:prod`

### 4) Deploy automático por ramas (recomendado)

- Define `main` como rama de producción en Vercel.
- Usa una rama `testing` para preview estable.
- Cada push a `testing` genera deploy preview.
- Cada push/merge a `main` genera deploy prod.

### 5) Dominio sugerido

- Producción: `app.tu-dominio.com` (Production)
- Testing: `testing.tu-dominio.com` (alias a Preview)

Para alias manual:

```bash
vercel alias set <preview-deployment-url> testing.tu-dominio.com
```

## 📊 Funcionalidades de Estadísticas

El sistema incluye utilitarios avanzados para el cálculo de estadísticas:

- **Passer Rating**: Calcula el rating del quarterback
- **Promedios**: Yardas por intento, por recepción, etc.
- **Eficiencias**: Terceras oportunidades, zona roja
- **Clasificaciones**: Ordenamiento automático de standings
- **Validaciones**: Números de jersey, puntuaciones, etc.

## 🚀 Próximas Características

- [ ] Sistema de autenticación
- [ ] API REST completa
- [ ] Dashboard en tiempo real
- [ ] Generación de reportes
- [ ] Aplicación móvil
- [ ] Integración con redes sociales
- [ ] Sistema de notificaciones
- [ ] Modo offline

## 🤝 Contribuciones

Este es un proyecto de práctica personal. Si tienes sugerencias o mejoras:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 👨‍💻 Autor

Desarrollado como proyecto de práctica para mejorar habilidades en TypeScript y desarrollo full-stack.

---

## 📈 Modelo de Datos Completo

### Relaciones Entre Entidades

```
Season (1) ↔ (N) Tournament
Tournament (1) ↔ (N) Division
Division (1) ↔ (N) Team
Team (1) ↔ (N) Player
Tournament + Division (1) ↔ (N) Game
Game (1) ↔ (N) GameEvent
Player + Tournament (1) ↔ (1) PlayerStatistics
Team + Tournament (1) ↔ (1) TeamStatistics
Division (1) ↔ (N) Standing
Venue (1) ↔ (N) Game
```

### Índices de Base de Datos

Para optimizar el rendimiento, se han implementado índices en:

- Nombres únicos de torneos por año
- Equipos únicos por división
- Números de jersey únicos por equipo
- Fechas de partidos
- Estados de entidades
- Ubicaciones geográficas de venues

## 🎮 Casos de Uso Principales

1. **Gestión de Torneos**: Crear y configurar nuevas competiciones
2. **Registro de Equipos**: Inscribir equipos con sus jugadores
3. **Programación**: Crear calendario de partidos
4. **Seguimiento en Vivo**: Registrar eventos durante los juegos
5. **Estadísticas**: Generar reportes y rankings
6. **Tabla de Posiciones**: Mantener clasificaciones actualizadas

Este sistema proporciona una base sólida para cualquier organización que desee gestionar ligas de Flag Football de manera profesional y completa.
