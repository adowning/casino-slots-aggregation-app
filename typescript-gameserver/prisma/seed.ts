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
  })
  console.log(`Seeding finished.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
