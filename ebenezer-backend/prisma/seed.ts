import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const prisma = new PrismaClient();

const ROOMS: { roomNumber: string; type: string; pricePerNight: number }[] = [
  { roomNumber: "101", type: "Standard", pricePerNight: 20000 },
  { roomNumber: "102", type: "Standard", pricePerNight: 20000 },
  { roomNumber: "103", type: "Deluxe", pricePerNight: 30000 },
  { roomNumber: "104", type: "Deluxe", pricePerNight: 30000 },
  { roomNumber: "105", type: "Suite", pricePerNight: 45000 },
];

async function seedRooms() {
  for (const room of ROOMS) {
    await prisma.room.upsert({
      where: { roomNumber: room.roomNumber },
      update: {},
      create: room,
    });
  }
  console.log(`Seeded ${ROOMS.length} rooms`);
}

async function main() {
  const name = process.env.SEED_ADMIN_NAME || "Admin";
  const email = process.env.SEED_ADMIN_EMAIL || "admin@ebenezer.com";
  const password = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin already exists: ${email}`);
  } else {
    const hashed = await bcrypt.hash(password, 10);
    const admin = await prisma.user.create({
      data: { fullName: name, email, password: hashed, role: "ADMIN" },
    });

    console.log(`Created admin: ${admin.email} (password: ${password})`);
  }

  await seedRooms();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
