import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log(`Start seeding ...`)
  await prisma.dataLog.createMany({
    data: [
      { message: 'Log entry 1 - Initial seed' },
      { message: 'Log entry 2 - Initial seed' },
      { message: 'Log entry 3 - Initial seed' },
      { message: 'Log entry 4 - Initial seed' },
      { message: 'Log entry 5 - Initial seed' },
    ],
    skipDuplicates: true, // Optional: useful if you might re-run seeding
  });

  // Add new seed data for providers and games
  console.log(`Seeding providers...`);
  const provider1 = await prisma.gameslistProvider.upsert({
    where: { pid: 'providerone' },
    update: {},
    create: {
      pid: 'providerone',
      name: 'Provider One',
    },
  });

  const provider2 = await prisma.gameslistProvider.upsert({
    where: { pid: 'providertwo' },
    update: {},
    create: {
      pid: 'providertwo',
      name: 'Provider Two',
    },
  });
  console.log(`Providers seeded.`);

  console.log(`Seeding games...`);
  await prisma.gameslistGame.createMany({
    data: [
      { gid: 'game001', slug: 'game-one-slug', name: 'Game One', providerId: provider1.id, isActive: true },
      { gid: 'game002', slug: 'game-two-slug', name: 'Game Two', providerId: provider1.id, isActive: false },
      { gid: 'game003', slug: 'game-three-slug', name: 'Game Three', providerId: provider2.id, isActive: true },
    ],
    skipDuplicates: true, // Good for re-runnable seeds for unique fields like gid/slug
  });
  console.log(`Games seeded.`);

  console.log(`Seeding finished.`);
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
