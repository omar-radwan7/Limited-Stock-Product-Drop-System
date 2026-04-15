"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Log startup immediately
console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'SERVER_INIT',
    message: 'Starting server initialization...',
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: process.env.PORT ?? '3001',
}));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const products_routes_1 = __importDefault(require("./routes/products.routes"));
const reservations_routes_1 = __importDefault(require("./routes/reservations.routes"));
const products_controller_1 = require("./controllers/products.controller");
const logging_middleware_1 = require("./middleware/logging.middleware");
const error_middleware_1 = require("./middleware/error.middleware");
const expiry_worker_1 = require("./services/expiry.worker");
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'EXPRESS_INIT',
    message: 'Express app created, setting up middleware...',
}));
// ── Global Middleware ─────────────────────────────────────────────────────────
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json());
app.use(logging_middleware_1.requestIdMiddleware);
app.use(logging_middleware_1.requestLogger);
// ── Global Rate Limiter ───────────────────────────────────────────────────────
const globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 1000,
    message: { error: 'Too many requests', code: 'RATE_LIMITED', statusCode: 429 },
});
app.use(globalLimiter);
// ── System Routes (no auth required) ─────────────────────────────────────────
app.get('/', (_req, res) => res.json({ status: 'ok', service: 'Limited Stock Drop API' }));
app.get('/health', products_controller_1.getHealth);
app.get('/metrics', products_controller_1.getMetrics);
// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/products', products_routes_1.default);
app.use('/api', reservations_routes_1.default); // /api/reserve, /api/checkout
// ── Centralized Error Handler ─────────────────────────────────────────────────
app.use(error_middleware_1.errorHandler);
console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'ROUTES_CONFIGURED',
    message: 'Routes and middleware configured',
}));
// ── Background Workers ────────────────────────────────────────────────────────
(0, expiry_worker_1.initExpiryWorker)();
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
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'SERVER_START',
        port,
        nodeEnv: process.env.NODE_ENV ?? 'development',
    }));
});
exports.default = app;
//# sourceMappingURL=index.js.map