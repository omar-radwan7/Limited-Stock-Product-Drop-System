# Limited-Stock Product Drop System

A real-time inventory reservation system built for high-demand product drops with atomic concurrency guarantees.

**🎥 Loom Walkthrough:** *(link here)*
**🏗 Architecture Diagram:** *(link here)*
**🌐 Hosted Demo:** *(https://pxxl.app/ link here)*

---

## Quick Start

> **Requires:** [Docker Desktop](https://www.docker.com/products/docker-desktop/)

```bash
# First run (wipes DB volume so seed runs clean)
docker-compose down -v && docker-compose up --build
```

Then open → **http://localhost:5173**

> ⏳ Wait ~30 seconds for the database to initialize on first boot.

---

## How Race Conditions Were Handled

Every reservation runs inside a **PostgreSQL `Serializable` transaction**. When two users simultaneously attempt to grab the last unit, only one transaction commits — the other receives a serialization failure and is rejected cleanly. No overselling is possible.

Stock is also decremented **inside** the transaction (not after), so there is no window between "check" and "update."

---

## Schema Decisions

- **`User` → `Reservation` → `Order` chain** enforces that a product can only be purchased after a valid reservation, preventing direct checkout bypasses.
- **`ReservationStatus` enum** (`PENDING`, `COMPLETED`, `EXPIRED`, `CANCELLED`) makes reservation lifecycle explicit and queryable by index.
- **`expiresAt` on Reservation** enables a background worker to auto-release stock every 60 seconds, keeping inventory accurate without user intervention.
- **`InventoryLog`** provides a full audit trail of every stock change and its reason.

---

## Trade-offs

| Decision | Trade-off |
|---|---|
| PostgreSQL Serializable isolation | Slightly higher lock contention vs. optimistic locking, but simpler and safer for this scale |
| Monorepo (backend + frontend) | Easier to develop and demo, harder to scale independently |
| `nodemon` in Docker | Convenient for reviewers but not suitable for production |
| Demo token bypass instead of full JWT auth | Eliminates reviewer friction, but would be replaced by proper auth in production |

---

## What Would Break at 10k Concurrent Users

- **Serializable transactions** would cause high lock contention and increased transaction rollbacks, degrading reservation throughput significantly.
- The **single Node.js process** would become a CPU bottleneck.
- The **expiry worker** running in the same process would lag under load.
- A single Postgres instance would hit connection pool limits.

---

## How to Scale It

1. **Horizontal scaling** — Run multiple backend instances behind a load balancer (e.g., AWS ALB).
2. **Redis for reservations** — Move the reservation lock to Redis with atomic `SETNX` for sub-millisecond contention handling at high concurrency.
3. **Queue-based checkout** — Use a job queue (BullMQ/SQS) so checkout processing is decoupled from the HTTP request.
4. **Read replicas** — Route product listing queries to Postgres read replicas.
5. **CDN for static assets** — Serve frontend via CloudFront/Vercel Edge.

---

## Running Tests

```bash
cd backend && npm test      # 12 backend tests (Jest)
cd frontend && npm test -- --run  # 12 frontend tests (Vitest)
```

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite, nginx |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL 16, Prisma ORM |
| Containerization | Docker, Docker Compose |
