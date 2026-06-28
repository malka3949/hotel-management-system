import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // First branch
  const branch = await prisma.branch.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'מלון מרכז תל אביב',
      address: 'רחוב הרצל 1, תל אביב',
      phone: '03-1234567',
      email: 'tlv@hotel.co.il',
      contactPerson: 'שרה לוי',
    },
  });

  // chain_admin (no branch)
  await prisma.user.upsert({
    where: { email: 'admin@hotel.co.il' },
    update: {},
    create: {
      name: 'מנהל מערכת',
      email: 'admin@hotel.co.il',
      passwordHash: await bcrypt.hash('Admin123!', 12),
      role: 'chain_admin',
      branchId: null,
    },
  });

  // hotel_manager for branch
  await prisma.user.upsert({
    where: { email: 'manager@hotel.co.il' },
    update: {},
    create: {
      name: 'יוסי כהן',
      email: 'manager@hotel.co.il',
      passwordHash: await bcrypt.hash('Manager123!', 12),
      role: 'hotel_manager',
      branchId: branch.id,
    },
  });

  // receptionist
  await prisma.user.upsert({
    where: { email: 'reception@hotel.co.il' },
    update: {},
    create: {
      name: 'מיכל דוד',
      email: 'reception@hotel.co.il',
      passwordHash: await bcrypt.hash('Reception123!', 12),
      role: 'receptionist',
      branchId: branch.id,
    },
  });

  console.log('✓ Seed complete');
  console.log('  admin@hotel.co.il / Admin123!');
  console.log('  manager@hotel.co.il / Manager123!');
  console.log('  reception@hotel.co.il / Reception123!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
