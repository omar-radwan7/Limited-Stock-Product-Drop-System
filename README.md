# Limited-Stock Product Drop System

A production-grade system built to handle **high-concurrency product drops** without ever overselling. Designed with strict TypeScript, transactional safety, and a premium dark-mode UI.

---

## 1. How Race Conditions Were Handled

Two complementary mechanisms prevent overselling:

### `SELECT FOR UPDATE` (Row-Level Lock)
Inside each `POST /api/reserve` transaction, we issue:
```sql
SELECT * FROM "Product" WHERE id = $1 FOR UPDATE
```
This acquires a **row-level exclusive lock** on the product. Any other transaction trying to read-or-write this same product row is **blocked until the first transaction commits or rolls back**. This ensures no two transactions can read the same "available" stock simultaneously.

### Serializable Isolation Level
Both `/api/reserve` and `/api/checkout` run at `Prisma.TransactionIsolationLevel.Serializable`. Under this isolation level, PostgreSQL ensures that all concurrent transactions execute as if they were **sequential** — eliminating phantom reads and write skew anomalies. If two transactions conflict, PostgreSQL rolls one back with a serialization failure error; the client must retry.

Together, these two layers mean **stock can never go negative**, regardless of how many concurrent users hit the endpoint simultaneously.

---

## 2. Schema Decisions

### Why `InventoryLog`?
The `InventoryLog` table is a **complete, immutable audit trail** of every stock movement. Rather than inferring what happened from the current `Product.stock` value:
- `RESERVED` — logs a **negative** `changeAmount` when stock is locked for a reservation
- `SOLD` — logs the quantity definitively sold (confirmed)
- `EXPIRED` — logs a **positive** `changeAmount` when stock is restored
- `RELEASED` — reserved for manual/admin releases

This means if `Product.stock` ever diverges from expectations, you can **replay the log** to reconstruct exactly what happened and when. It also enables time-series analytics (e.g., "how many units were reserved at 2 AM vs 10 AM?").

### Why `Reservation` as an intermediate state?
Products aren't sold directly — a user first creates a **reservation** (stock locked, expires in 5 minutes) and then completes **checkout**. This two-phase model:
- Gives users time to complete payment without blocking others indefinitely
- Allows stock to self-heal when reservations expire
- Creates a clear audit record (PENDING → COMPLETED or PENDING → EXPIRED)

### Why a unique constraint on `Order.reservationId`?
This prevents a reservation from being checked out twice — even if two concurrent requests slip through, the DB unique constraint is the final guard.

---

## 3. Trade-offs

| Decision | Pro | Con |
|----------|-----|-----|
| **Serializable isolation** | Guarantees no oversell under any concurrency pattern | Higher lock contention, more transaction retries under heavy load |
| **Row-level `FOR UPDATE`** | Precisely targeted — only locks one product row | Doesn't help if the bottleneck is outside the transaction |
| **Per-reservation expiry transactions** | Failure of one row doesn't block others | Slightly more DB round-trips vs. a bulk update |
| **5-minute reservation window** | Enough time to pay without holding stock forever | Aggressive enough that stock returns quickly on abandonment |
| **Polling (every 5s)** | Simple, no WebSocket infra needed | Adds load; stock display is up to 5s stale |

---

## 4. What Would Break at 10k Concurrent Users

1. **PostgreSQL connection pool exhaustion** — Prisma's default pool is ~10 connections. 10k concurrent requests would queue and timeout. Needs PgBouncer or equivalent.
2. **Lock contention** — Under Serializable isolation, thousands of transactions competing for the same product row will trigger cascading serialization failures, causing retry storms.
3. **Expiry worker contention** — The cron worker may conflict with active reservation transactions at exactly the same time, causing additional lock waits.
4. **Single Express process** — One Node.js process handling 10k concurrent requests will hit the event loop's limits. Needs horizontal scaling with a load balancer.
5. **Cold reads** — Product stock queries hit the primary DB. At this scale, read replicas or a Redis cache layer are essential.

---

## 5. How to Scale It

### Immediate wins (1k→10k users)
- **PgBouncer** — transaction-mode pooling to reuse DB connections
- **Redis cache** for `GET /api/products/:id` — cache stock reads with 1-2s TTL, invalidate on mutation
- **Horizontal scaling** — run multiple backend instances behind a load balancer (Nginx, Cloudflare)

### Architecture for 10k+ users
- **Redis Distributed Locking (Redlock)** — acquire a lock on `product:{id}` before the DB transaction. Faster than Serializable and works across PostgreSQL replicas.
- **Queue-based reservation** (BullMQ + Redis) — instead of inline transactions, push reserve requests to a per-product queue. A single worker per product processes requests serially — no lock contention, perfect ordering.
- **Read replicas** — direct all `GET /api/products` reads to replicas, only mutations hit the primary.
- **Event-driven expiry** — replace cron with a Redis sorted set (score = expiresAt timestamp). A dedicated worker polls expired members with `ZRANGEBYSCORE`, removing them atomically.

---

## 6. Local Setup

### Prerequisites
- Node.js ≥ 18
- PostgreSQL ≥ 14
- `npm`

### Backend
```bash
cd backend
cp .env.example .env
# Edit .env — set DATABASE_URL, JWT_SECRET

npm install
npx prisma migrate dev --name init
npx prisma db seed   # see prisma/seed.ts (optional)

npm run dev          # starts on PORT from .env (default 3001)
```

### Frontend
```bash
cd frontend
cp .env.example .env
# Edit .env — set VITE_DEMO_PRODUCT_ID to a seeded product's UUID

npm install
npm run dev          # starts on http://localhost:5173
```

### Running Tests
```bash
# Backend tests (Jest + ts-jest)
cd backend && npm test

# Frontend tests (Vitest + React Testing Library)
cd frontend && npm test
```

### Key Endpoints
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness probe |
| `GET` | `/metrics` | Reservation + order counts |
| `GET` | `/api/products` | Paginated product list |
| `GET` | `/api/products/:id` | Single product with current stock |
| `POST` | `/api/reserve` | Create reservation (auth required) |
| `POST` | `/api/checkout` | Complete order (auth required) |

### Authentication
All `/api/reserve` and `/api/checkout` requests require a `Bearer <JWT>` header. The JWT must be signed with the `JWT_SECRET` from `.env`. For local testing, generate a token with:
```bash
node -e "
  const jwt = require('jsonwebtoken');
  console.log(jwt.sign({ userId: 'test-user-id', email: 'test@example.com' }, 'your_jwt_secret_here_replace_in_production', { expiresIn: '24h' }));
"
```

---

## Architecture Diagram

```
[Browser / Frontend (Vite + React)]
        │
        │ HTTP + Bearer JWT
        ▼
[Express API (Node.js + TypeScript)]
   ├── authMiddleware (JWT verification)
   ├── GET /api/products → products.controller
   ├── POST /api/reserve → reservations.controller
   │       └── Serializable Tx + SELECT FOR UPDATE
   └── POST /api/checkout → reservations.controller
           └── Serializable Tx

[node-cron @ 60s]
   └── processExpiredReservations()
           └── Per-reservation ReadCommitted Tx

[PostgreSQL]
   ├── Product (stock field, row-locked during reserve)
   ├── Reservation (PENDING → COMPLETED / EXPIRED)
   ├── Order (1:1 with completed Reservation)
   └── InventoryLog (full audit trail of stock changes)
```
