import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function reset() {
  console.log('Resetting system state...');
  await prisma.reservation.deleteMany({});
  await prisma.product.update({
    where: { id: '550e8400-e29b-41d4-a716-446655440002' },
    data: { stock: 10 }
  });
  console.log('System state reset successful. Stock is back to 10.');
  await prisma.$disconnect();
}

reset().catch(console.error);
