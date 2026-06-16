/**
 * Optional dev seed. Run with: npm run db:seed
 * Creates a demo user with credits so you can test the chat UI
 * without going through the Yeumoney flow.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@luxcipher.local";
  const password = "Demo1234!";
  const hash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hash, credits: 1000, emailVerified: true },
    create: {
      email,
      password: hash,
      name: "Demo User",
      credits: 1000,
      emailVerified: true
    }
  });

  console.log("✔ Seeded user:");
  console.log("   email:    " + email);
  console.log("   password: " + password);
  console.log("   credits:  " + user.credits);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
