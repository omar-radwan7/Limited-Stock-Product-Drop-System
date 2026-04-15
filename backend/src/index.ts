import dotenv from 'dotenv';
dotenv.config();

// Log startup immediately
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  event: 'SERVER_INIT',
  message: 'Starting server initialization...',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: process.env.PORT ?? '3001',
}));

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import productsRouter from './routes/products.routes';
import reservationsRouter from './routes/reservations.routes';
import { getHealth, getMetrics } from './controllers/products.controller';
import { requestIdMiddleware, requestLogger } from './middleware/logging.middleware';
import { errorHandler } from './middleware/error.middleware';
import { initExpiryWorker } from './services/expiry.worker';

const app = express();
const port = process.env.PORT || 3001;

console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  event: 'EXPRESS_INIT',
  message: 'Express app created, setting up middleware...',
}));

// ── Global Middleware ─────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(express.json());
app.use(requestIdMiddleware);
app.use(requestLogger);

// ── Global Rate Limiter ───────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000,
  message: { error: 'Too many requests', code: 'RATE_LIMITED', statusCode: 429 },
});
app.use(globalLimiter);

// ── System Routes (no auth required) ─────────────────────────────────────────
app.get('/', (_req, res) => res.json({ status: 'ok', service: 'Limited Stock Drop API' }));
app.get('/health', getHealth);
app.get('/metrics', getMetrics);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/products', productsRouter);
app.use('/api', reservationsRouter); // /api/reserve, /api/checkout

// ── Centralized Error Handler ─────────────────────────────────────────────────
app.use(errorHandler);

console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  event: 'ROUTES_CONFIGURED',
  message: 'Routes and middleware configured',
}));

// ── Background Workers ────────────────────────────────────────────────────────
initExpiryWorker();

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'SIGTERM_RECEIVED',
    message: 'Shutting down gracefully...',
  }));
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'SIGINT_RECEIVED',
    message: 'Shutting down gracefully...',
  }));
  process.exit(0);
});

app.listen(Number(port), '0.0.0.0', () => {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'SERVER_START',
      port,
      nodeEnv: process.env.NODE_ENV ?? 'development',
    }),
  );
});

export default app;
