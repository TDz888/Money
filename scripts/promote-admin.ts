/**
 * Promote a user to ADMIN by email. Use as a one-time bootstrap if the
 * ADMIN_BOOTSTRAP_EMAIL env was not set when the first user registered.
 *
 * Usage: npx tsx scripts/promote-admin.ts user@example.com
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const email = process.argv[2];

if (!email) {
  console.error("Usage: npm run admin:promote -- user@example.com");
  process.exit(1);
}

async function main() {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found with email ${email}`);
    process.exit(1);
  }
  if (user.role === "ADMIN") {
    console.log(`${email} is already an admin.`);
    return;
  }
  await prisma.user.update({ where: { email }, data: { role: "ADMIN" } });
  console.log(`✔ ${email} is now ADMIN. Sign out and back in for the role to take effect.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
