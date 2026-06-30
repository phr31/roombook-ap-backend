require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rooms = [
    { name: 'Sala 1', capacity: 8 },
    { name: 'Sala 2', capacity: 12 },
    { name: 'Sala 3', capacity: 6 },
  ];

  for (const room of rooms) {
    await prisma.room.upsert({
      where: { name: room.name },
      update: {},
      create: room,
    });
  }

  console.log('Rooms seeded successfully.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
