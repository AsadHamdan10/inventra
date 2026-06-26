/**
 * Inventra — Database Seed
 * Creates the Super Admin account on first run.
 * Run: npm run db:seed
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Inventra database…');

  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Inventra@SuperAdmin123';
  const hash = await bcrypt.hash(superAdminPassword, 12);

  const superAdmin = await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: {},
    create: {
      companyName: 'Inventra Admin',
      username: 'superadmin',
      email: 'admin@inventra.app',
      password: hash,
      role: 'super_admin',
      status: 'approved',
      forcePasswordChange: false,
    },
  });

  console.log(`✅ Super Admin created: ${superAdmin.username} (${superAdmin.email})`);
  console.log(`🔐 Password: ${superAdminPassword}`);
  console.log('⚠️  Change this password immediately after first login!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
