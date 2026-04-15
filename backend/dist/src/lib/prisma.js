"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbConnected = void 0;
const client_1 = require("@prisma/client");
// Simple PrismaClient initialization - works in most environments
const prisma = new client_1.PrismaClient();
// Async DB connection check - don't block server startup
// This allows health checks to pass even if DB is temporarily unavailable
let dbConnected = false;
exports.dbConnected = dbConnected;
prisma
    .$connect()
    .then(() => {
    exports.dbConnected = dbConnected = true;
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'DB_CONNECTED',
        message: 'Prisma connected to PostgreSQL',
    }));
})
    .catch((err) => {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'DB_CONNECTION_FAILED',
        error: message,
        hint: 'Server will continue running. DB operations will fail until connection is restored.',
    }));
    // Don't exit - let the server run so health checks can pass
});
exports.default = prisma;
//# sourceMappingURL=prisma.js.map