import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

// Verify DB connection on startup — fail fast, don't silently continue
prisma
  .$connect()
  .then(() => {
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
      }),
    );
    process.exit(1);
  });

export default prisma;

