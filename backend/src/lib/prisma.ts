import { PrismaClient } from '@prisma/client';

// Simple PrismaClient initialization - works in most environments
const prisma = new PrismaClient();

// Async DB connection check - don't block server startup
// This allows health checks to pass even if DB is temporarily unavailable
let dbConnected = false;

prisma
  .$connect()
  .then(() => {
    dbConnected = true;
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'DB_CONNECTED',
        message: 'Prisma connected to PostgreSQL',
      }),
    );
  })
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'DB_CONNECTION_FAILED',
        error: message,
        hint: 'Server will continue running. DB operations will fail until connection is restored.',
      }),
    );
    // Don't exit - let the server run so health checks can pass
  });

export default prisma;
export { dbConnected };

