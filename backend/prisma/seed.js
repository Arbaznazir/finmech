import bcrypt from 'bcryptjs';
import prisma from '../src/lib/prisma.js';

const ADMIN_EMAIL = 'admin@finmech.com';
const ADMIN_PASSWORD = 'Admin@123'; // Change this on first login
const ADMIN_NAME = 'Admin';

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

  if (existing) {
    console.log(`✅ Admin user already exists: ${ADMIN_EMAIL}`);
    return;
  }

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

  await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      password: hashedPassword,
      name: ADMIN_NAME,
      company: 'FinMech',
      plan: 'investor',
    },
  });

  console.log(`✅ Admin user created: ${ADMIN_EMAIL} (password: ${ADMIN_PASSWORD})`);
  console.log('⚠️  Change the admin password after first login!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
