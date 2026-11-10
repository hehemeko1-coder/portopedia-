import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) {
    throw new Error("Set BOOTSTRAP_ADMIN_EMAIL to the verified account that should receive administrator access.");
  }

  const result = await prisma.user.updateMany({
    where: { email, emailVerifiedAt: { not: null } },
    data: { role: "ADMIN" }
  });

  if (result.count !== 1) {
    throw new Error("No verified account matched BOOTSTRAP_ADMIN_EMAIL. Register and verify that account first.");
  }

  console.info("Administrator role granted to the verified bootstrap account.");
}

main()
  .catch((error: unknown) => {
    console.error("Administrator bootstrap failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
