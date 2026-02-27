# 🏰 Catan Tournament

Plataforma web para organizar y jugar torneos de Catan. Monorepo con NestJS (API), React (Web) y tipos compartidos.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + Material UI |
| Backend | NestJS + TypeScript |
| Database | PostgreSQL 15 + Prisma ORM |
| Auth | JWT + Refresh Tokens (bcrypt) |
| Realtime | Socket.IO |
| Infra | Docker Compose |

---

## Quick Start (local con Docker)

### Prerrequisitos
- Docker Desktop + Docker Compose v2
- Node.js 20+ (para desarrollo local sin Docker)

### 1. Clonar y configurar

```bash
git clone <repo-url>
cd catan-tournament
cp apps/api/.env.example apps/api/.env
```

### 2. Levantar con Docker

```bash
docker compose up --build
```

Servicios disponibles:
- **Web**: http://localhost:5173
- **API**: http://localhost:3000/api
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### 3. Migrar y seedear la base de datos

```bash
# En otra terminal (mientras Docker corre)
docker exec catan-api sh -c "cd apps/api && npx prisma migrate deploy && npm run db:seed"
```

O si corrés localmente:
```bash
npm install
npm run db:migrate
npm run db:seed
```

---

## Desarrollo local (sin Docker)

### 1. Iniciar PostgreSQL y Redis

```bash
# Opción A: Solo las dependencias en Docker
docker compose up postgres redis -d

# Opción B: PostgreSQL local
createdb catan_tournament
```

### 2. Instalar dependencias

```bash
npm install   # instala todos los workspaces
```

### 3. Configurar .env

```bash
cp apps/api/.env.example apps/api/.env
# Editar DATABASE_URL si es necesario
```

### 4. Migrar y generar Prisma

```bash
npm run db:migrate  # ejecuta migrations
npm run db:seed     # carga datos de prueba
```

### 5. Correr en modo dev

```bash
npm run dev  # corre API (port 3000) y Web (port 5173) en paralelo
```

---

## Scripts principales

```bash
npm run dev           # Corre API + Web en paralelo
npm run test          # Unit tests del API
npm run test:e2e      # Integration tests (requiere DB)
npm run db:migrate    # Crear/aplicar migraciones Prisma
npm run db:seed       # Cargar datos de prueba
npm run db:studio     # Abrir Prisma Studio (GUI)
npm run build         # Build de producción API + Web
```

---

## Credenciales de prueba (después del seed)

Todos los usuarios tienen password: **`Password123!`**

| Alias | Email | Elo |
|-------|-------|-----|
| magnus | magnus@seed.catan | 1450 |
| anacatan | anacatan@seed.catan | 1380 |
| newA | newA@seed.catan | 1000 (unranked) |
| ... | {alias}@seed.catan | ... |

El organizador es `magnus@seed.catan`. El torneo ya tiene 3 rondas y una final simuladas.

---

## Estructura del proyecto

```
catan-tournament/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Modelo de datos
│   │   │   └── seed.ts         # Datos de prueba
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── auth/       # JWT + refresh tokens
│   │       │   ├── users/      # Perfiles y stats
│   │       │   ├── tournaments/ # CRUD + estado
│   │       │   ├── registrations/ # Inscripciones
│   │       │   ├── rounds/     # Rondas + generación de mesas
│   │       │   ├── results/    # Resultados + disputas
│   │       │   ├── leaderboard/ # Ranking con desempates
│   │       │   ├── rating/     # Elo multijugador
│   │       │   ├── audit/      # Log de acciones
│   │       │   └── realtime/   # Socket.IO gateway
│   │       └── prisma/         # PrismaService (global)
│   └── web/                    # React + Vite frontend
│       └── src/
│           ├── api/            # Clientes HTTP (Axios)
│           ├── components/     # UI components
│           ├── hooks/          # useAuth, useSocket, etc.
│           ├── pages/          # Rutas principales
│           └── store/          # Zustand (auth state)
└── packages/
    └── shared/                 # Enums, tipos y DTOs compartidos
```

---

## API REST (resumen)

### Auth
```
POST /api/auth/register      # Crear cuenta
POST /api/auth/login         # Login → tokens
POST /api/auth/refresh       # Renovar access token
POST /api/auth/logout        # Revocar refresh token
GET  /api/auth/me            # Usuario actual
```

### Torneos
```
GET    /api/tournaments               # Listado paginado
POST   /api/tournaments               # Crear torneo
GET    /api/tournaments/:id           # Detalle
PATCH  /api/tournaments/:id           # Editar (DRAFT/PUBLISHED)
POST   /api/tournaments/:id/publish   # → PUBLISHED
POST   /api/tournaments/:id/start-checkin # → CHECKIN
POST   /api/tournaments/:id/start     # → RUNNING
POST   /api/tournaments/:id/cancel    # → CANCELLED
```

### Inscripciones
```
POST   /api/tournaments/:id/register              # Anotarse
GET    /api/tournaments/:id/registrations         # Lista (staff)
PATCH  /api/tournaments/:id/registrations/:userId # Aprobar/Rechazar
POST   /api/tournaments/:id/checkin               # Check-in propio
```

### Rondas
```
POST   /api/tournaments/:id/stages                           # Crear stage
POST   /api/tournaments/:id/stages/:stageId/rounds           # Crear ronda
POST   /api/tournaments/:id/rounds/:roundId/generate-tables  # Generar mesas
POST   /api/tournaments/:id/rounds/:roundId/start            # Iniciar ronda
POST   /api/tournaments/:id/rounds/:roundId/close            # Cerrar ronda
GET    /api/tournaments/:id/rounds/:roundId                  # Detalle
```

### Resultados
```
POST   /api/tournaments/:id/tables/:tableId/results  # Cargar resultados
PATCH  /api/tournaments/:id/tables/:tableId/results  # Corregir
POST   /api/tournaments/:id/results/:resultId/dispute  # Disputar
PATCH  /api/tournaments/:id/disputes/:disputeId/resolve # Resolver
```

### Leaderboard y Perfil
```
GET    /api/tournaments/:id/leaderboard  # Ranking del torneo
GET    /api/tournaments/:id/bracket      # Bracket semi/final
GET    /api/users/:id/profile            # Perfil público
GET    /api/users/:id/stats              # Stats + historial Elo
PATCH  /api/users/me/profile             # Editar perfil propio
```

### Socket.IO (namespace `/events`)
| Evento (cliente→servidor) | Descripción |
|---|---|
| `join-tournament` | Suscribirse a updates del torneo |
| `leave-tournament` | Desuscribirse |

| Evento (servidor→cliente) | Descripción |
|---|---|
| `leaderboard_update` | Ranking actualizado |
| `round_started` | Nueva ronda iniciada |
| `round_closed` | Ronda cerrada |
| `result_submitted` | Resultados cargados en una mesa |
| `result_corrected` | Resultados corregidos |
| `stage_advanced` | Avance a semifinal/final |
| `dispute_opened` | Disputa abierta |
| `dispute_resolved` | Disputa resuelta |

---

## Modelo de Ranking (Elo Multijugador)

### Fundamento

Usamos una adaptación del sistema Elo para partidas de **4 jugadores** (o 3 en mesas incompletas).

### Fórmulas

```
# Score real normalizado (suma = 1.0 para 4 jugadores)
S_i = (N - position_i + 1) / (N*(N+1)/2)

# Para 4 jugadores:
#   1ro: 4/10 = 0.40
#   2do: 3/10 = 0.30
#   3ro: 2/10 = 0.20
#   4to: 1/10 = 0.10

# Score esperado (campo = promedio de rivales)
E_i = 1 / (1 + 10^((avgOpponentRating - R_i) / 400))

# K-factor (disminuye con experiencia)
K = 32  (< 10 torneos)
K = 24  (10-29 torneos)
K = 16  (30-99 torneos)
K = 12  (100+ torneos)

# Delta por torneo (suma de todas las mesas)
delta_i = K * (S_i - E_i)

# Rating nuevo (piso = 100)
R_new = max(100, R_old + delta_i)
```

### Cuándo se actualiza

Las ratings se calculan **una vez al finalizar el torneo** (`status → FINISHED`), acumulando los deltas de todas las mesas del torneo. Esto se implementa en [rating.service.ts](apps/api/src/modules/rating/rating.service.ts).

### Por qué este método

- **Simple y auditable**: los jugadores pueden entender por qué subieron o bajaron.
- **Zero-sum aproximado**: para jugadores del mismo nivel, la suma de deltas ≈ 0.
- **K-factor variable**: los nuevos jugadores fluctúan más (rating provisional) hasta establecerse.

---

## Algoritmos de Generación de Mesas

### RANDOM (minimiza repeticiones)

```
1. Construir penalty matrix: penalties[a][b] = veces que a y b jugaron juntos
2. Fisher-Yates shuffle de la lista de jugadores
3. Por cada mesa:
   a. Tomar un "anchor" (primer jugador)
   b. Puntuar cada candidato restante: score = suma de penalizaciones con miembros actuales de la mesa
   c. Seleccionar los 3 con menor score (+ tie-break aleatorio)
4. Remainder: si sobran 3 → mesa de 3 (válido en Catan)
              si sobran 1-2 → añadir a última mesa (warning al organizador)
```

Implementado en [table-generation.service.ts](apps/api/src/modules/rounds/table-generation.service.ts).

### BALANCED (por performance)

```
1. Ordenar jugadores por puntos acumulados en el torneo (DESC)
2. Agrupar en buckets de 4: [1ro-4to], [5to-8vo], etc.
3. Cada bucket = una mesa
4. Remainder: igual que RANDOM
```

Útil para rondas avanzadas donde se quiere que los mejores se enfrenten entre sí.

---

## Diagrama ER (simplificado)

```
users ──────────────────────────────────────────────────┐
  │                                                     │
  │ 1:1                                                │
  ▼                                                     │
user_stats                                             │
                                                       │
users ─── 1:N ─── tournament_registrations ─── N:1 ─── tournaments
  │                                                     │
  │                                                     │ 1:N
  │ 1:N                                                ▼
  ▼                                               tournament_roles
tournament_roles                                       │
                                               (ORGANIZER | STAFF)
                    tournaments ─── 1:N ─── stages
                                              │
                                              │ 1:N
                                              ▼
                                           rounds
                                              │
                                              │ 1:N
                                              ▼
                                           tables ──── matchup_history
                                              │
                                        ┌────┴────┐
                                        │         │
                                        ▼         ▼
                                   table_seats  results
                                        │         │
                                        │         │ 1:N
                                        │         ▼
                                        │      disputes
                                        │
                                     users (FK)

users ─── 1:N ─── rating_history ─── N:1 ─── tournaments
users ─── 1:N ─── refresh_tokens
tournaments ─── 1:N ─── audit_log ─── N:1 ─── users
```

### Constraints críticos

| Constraint | Implementación |
|-----------|---------------|
| Un usuario no puede inscribirse dos veces | `@@unique([tournamentId, userId])` en `tournament_registrations` |
| Un resultado por jugador por mesa | `@@unique([tableId, userId])` en `results` |
| No puede haber dos jugadores en el mismo puesto | `@@unique([tableId, position])` en `results` |
| Un jugador no puede estar en dos mesas de la misma ronda | validación en `RoundsService` |
| Transiciones de estado válidas | mapa `VALID_TRANSITIONS` en `TournamentsService` |

### Estados del torneo

```
DRAFT → PUBLISHED → CHECKIN → RUNNING → FINISHED
  └─────────────────────────────────────────────→ CANCELLED
```

### Estados de inscripción

```
REQUESTED → APPROVED → CHECKED_IN
         ↘ REJECTED
         ↘ REMOVED (desde cualquier estado)
WAITLIST → APPROVED (cuando queda cupo)
```

---

## Testing

### Unit tests

```bash
npm run test --workspace=apps/api
```

Cubren:
- `EloCalculator`: kFactor, actualScore (zero-sum), calculateUpdates (upset, floor, zero-sum)
- `TableGenerationService`: RANDOM (count, no duplicates, penalty penalty), BALANCED (order), remainder handling
- `LeaderboardService.applyTiebreakers`: sort por puntos, wins, opponentStrength, avgPosition, orden personalizado

### Integration tests (e2e)

```bash
npm run test:e2e --workspace=apps/api
```

Requiere una base de datos PostgreSQL disponible (setear `DATABASE_URL`).

Cubren:
- Auth flow completo: register → login → refresh → me → logout
- Validaciones: email duplicado, password incorrecto, token inválido

---

## Extensibilidad

El modelo está preparado para:

- **Formatos adicionales**: `TournamentFormat` enum tiene `SWISS`, `GROUPS`, `SINGLE_ELIMINATION` listos. Implementar el algoritmo de clasificación correspondiente en `LeaderboardService`.
- **Método de ranking alternativo**: `EloCalculator` es una clase pura con funciones estáticas. Se puede swappear por Glicko-2 cambiando solo `rating.service.ts` y `elo.calculator.ts`.
- **Mobile**: la API REST + Socket.IO es agnóstica al cliente. Una app React Native puede consumir exactamente los mismos endpoints usando `@catan/shared` para tipos.
- **Auth providers**: la arquitectura de `AuthModule` con Passport.js permite agregar estrategias (Google, GitHub) sin modificar el resto.
- **Pago/inscripción**: agregar campo `entryFee` a `tournaments` y un nuevo estado `PAYMENT_PENDING` en `RegistrationStatus`.
