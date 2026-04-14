import { defineConfig } from '@prisma/config';

import 'dotenv/config';

export default defineConfig({
  earlyAccess: true,
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    seed: 'ts-node ./prisma/seed.ts',
  },
});

