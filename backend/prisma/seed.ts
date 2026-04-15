import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding high-end tech inventory with images...');

  // Create the demo user required for the portfolio auth bypass
  await prisma.user.upsert({
    where: { id: 'demo-user-123' },
    update: {},
    create: {
      id: 'demo-user-123',
      email: 'demo@instock.dev',
    },
  });

  const products = [
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'NVIDIA RTX 4090 FE',
      description: 'The ultimate GeForce GPU. Bring an enormous leap in performance, efficiency, and AI-powered graphics.',
      price: 1599.00,
      stock: 3,
      imageUrl: '/rtx4090.png'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      name: 'MacBook Pro (M3 Max)',
      description: 'The most advanced chips ever built for a personal computer. 16-inch Liquid Retina XDR display.',
      price: 3499.00,
      stock: 4,
      imageUrl: '/macbook.png'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440004',
      name: 'Sony WH-1000XM5',
      description: 'Industry leading noise cancelling headphones with two processors controlling 8 microphones.',
      price: 399.00,
      stock: 3,
      imageUrl: '/sony.png'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440005',
      name: 'Keychron Q1 Pro',
      description: 'QMK/VIA wireless custom mechanical keyboard with a full aluminum body and hot-swappable switches.',
      price: 199.00,
      stock: 5,
      imageUrl: '/keyboard.png'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440006',
      name: 'Steam Deck OLED',
      description: 'The definitive handheld gaming experience with a 7.4-inch HDR OLED display and faster downloads.',
      price: 549.00,
      stock: 3,
      imageUrl: '/steam_deck.png'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440007',
      name: 'GoPro Hero 12 Black',
      description: 'Best-in-class image quality, even better HyperSmooth video stabilization and a huge boost in battery life.',
      price: 399.00,
      stock: 3,
      imageUrl: '/gopro.png'
    }
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: { 
        name: p.name, 
        description: p.description, 
        price: p.price, 
        stock: p.stock,
        imageUrl: p.imageUrl
      },
      create: p,
    });
  }

  console.log('Tech inventory with images successfully synced.');
  await prisma.$disconnect();
}

seed().catch(console.error);
