import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.watchlist.findFirst({ where: { name: 'Demo brands' } });
  if (existing) {
    console.log('Seed: demo watchlist already exists, skipping.');
    return;
  }

  await prisma.watchlist.create({
    data: {
      name: 'Demo brands',
      terms: ['acme-corp', 'acme.com', 'acme-login'],
    },
  });

  console.log('Seed: created "Demo brands" watchlist.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
