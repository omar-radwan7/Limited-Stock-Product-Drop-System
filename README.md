# Technical Hardware Drop System

A high-fidelity, real-time inventory management and reservation system built for high-demand product drops. Designed with a focus on data integrity, concurrency handling, and a premium industrial user experience.

## 🚀 Key Features

- **Multi-Item Hardware Boutique**: A curated collection of technical assets with real-time stock tracking.
- **Smart Reservation Engine**: Implements a 5-minute checkout window with automatic stock release on expiry or cancellation.
- **Atomic Concurrency**: Backend powered by PostgreSQL & Prisma using `Serializable` transaction isolation levels to prevent race conditions and overselling during high-traffic bursts.
- **High-Fidelity Interface**: A minimalist industrial aesthetic using a custom "Cyber-Ink" palette, optimized for professional technical environments.
- **Session Persistence**: Automatic reservation resumption via secure local tokens, allowing users to refresh pages without losing their spot.

## 🛠️ Technical Stack

- **Frontend**: React 18, TypeScript, Vite, React Router, CSS Variables.
- **Backend**: Node.js, Express, TypeScript, Prisma ORM.
- **Database**: PostgreSQL with serializable transaction support.
- **Validation**: Zod schema validation for all API inputs.

## 📦 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL instance

### 2. Installation
```bash
# Clone the repository
git clone [repository-url]

# Install dependencies (Root)
npm install

# Setup Database (Backend)
cd backend
npx prisma migrate dev
npx prisma db seed

# Launch System
# Terminal 1: Backend
npm run dev

# Terminal 2: Frontend
cd ../frontend
npm run dev
```

## 🧪 Testing
The system includes comprehensive tests for:
- **Concurrency**: Simulation of simultaneous users competing for the same stock unit.
- **Expiry Logic**: Verification of automatic inventory release.
- **UI State**: High-precision rendering of 'Sold Out' and 'Critical Stock' states.

---
*Created by Omar Radwan*
