# Technical Hardware Drop System

A high-fidelity, real-time inventory management and reservation system built for high-demand product drops. Designed with a focus on data integrity, concurrency handling, and a premium industrial user experience.

## 🚀 Key Features

- **Multi-Item Hardware Boutique**: A curated collection of technical assets with real-time stock tracking.
- **Smart Reservation Engine**: Implements a 5-minute checkout window with automatic stock release on expiry or cancellation.
- **Atomic Concurrency**: Backend powered by PostgreSQL & Prisma using `Serializable` transaction isolation to prevent race conditions and overselling during high-traffic bursts.
- **High-Fidelity Interface**: A minimalist industrial aesthetic using a custom "Cyber-Ink" palette, optimized for professional technical environments.
- **Session Persistence**: Automatic reservation resumption via secure local tokens, allowing users to refresh pages without losing their spot.

## 🐳 Quick Start (Docker — Recommended)

> **Requirement**: [Docker Desktop](https://www.docker.com/products/docker-desktop/) must be installed.

```bash
# Clone the repository
git clone [repository-url]
cd Limited-Stock-Product-Drop-System

# Start everything with one command
docker-compose up --build
```

Then open:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

The database will be automatically created, migrated, and seeded with tech inventory. 🎉

---

## 🛠️ Manual Setup (Without Docker)

### Prerequisites
- Node.js (v18+)
- PostgreSQL running at `localhost:5432`

### Backend
```bash
cd backend
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🧪 Running Tests

```bash
# Backend (Jest — 12 tests)
cd backend && npm test

# Frontend (Vitest — 12 tests)
cd frontend && npm test -- --run
```

---

## 🛠️ Technical Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL, Prisma ORM |
| Validation | Zod |
| Containerization | Docker, Docker Compose |

---

*Created by Omar Radwan*
