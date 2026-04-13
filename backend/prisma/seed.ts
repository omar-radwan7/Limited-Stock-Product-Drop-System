import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });


async function main() {
  console.log('Seeding database...');

  // 1. Upsert a test user
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'test@example.com',
    },
  });

  // 2. Upsert a test product
  const product = await prisma.product.upsert({
    where: { id: '550e8400-e29b-41d4-a716-446655440002' },
    update: {
      stock: 10, // reset stock
    },
    create: {
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'Limited Edition Sneakers',
      description: 'Exclusive drop with only 10 units available.',
      price: 199.99,
      stock: 10,
    },
  });

  console.log('Seeding complete:', { user, product });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
