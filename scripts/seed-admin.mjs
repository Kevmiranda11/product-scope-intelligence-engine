import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function readArg(name) {
  const index = process.argv.findIndex((arg) => arg === name);
  if (index === -1) return '';
  return process.argv[index + 1] || '';
}

async function main() {
  const email = (readArg('--email') || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = (readArg('--password') || process.env.ADMIN_PASSWORD || '').trim();

  if (!email || !password) {
    throw new Error('Usage: npm run seed:admin -- --email admin@company.com --password "TempPass!123"');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: UserRole.admin,
      status: UserStatus.active,
      forcePasswordReset: true,
    },
    create: {
      email,
      passwordHash,
      role: UserRole.admin,
      status: UserStatus.active,
      forcePasswordReset: true,
    },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      forcePasswordReset: true,
    },
  });

  console.log('Admin user ready:', user);
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
