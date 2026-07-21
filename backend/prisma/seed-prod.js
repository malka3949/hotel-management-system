'use strict';
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
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

  const branchTlv = await prisma.branch.upsert({
    where: { id: '9049714c-9180-4b85-a7a2-c75dd18988c2' },
    update: {},
    create: {
      id: '9049714c-9180-4b85-a7a2-c75dd18988c2',
      name: 'מלון תל אביב',
      address: 'רחוב דיזנגוף 50, תל אביב',
      phone: '03-7654321',
      email: 'tlv@hotel.com',
      contactPerson: 'דני לוי',
    },
  });

  const branchJer = await prisma.branch.upsert({
    where: { id: 'a7688152-ff33-4e4f-8cc4-848500bdb800' },
    update: {},
    create: {
      id: 'a7688152-ff33-4e4f-8cc4-848500bdb800',
      name: 'מלון ירושלים',
      address: 'רחוב יפו 10, ירושלים',
      phone: '02-1234567',
      email: 'jer@hotel.com',
      contactPerson: 'רחל כהן',
    },
  });

  const adminHash = await bcrypt.hash('Admin123!', 12);
  const managerHash = await bcrypt.hash('Manager123!', 12);
  const receptionHash = await bcrypt.hash('Reception123!', 12);

  await prisma.user.upsert({
    where: { email: 'admin@hotel.co.il' },
    update: { passwordHash: adminHash },
    create: {
      name: 'מנהל מערכת',
      email: 'admin@hotel.co.il',
      passwordHash: adminHash,
      role: 'chain_admin',
      branchId: null,
    },
  });

  await prisma.user.upsert({
    where: { email: 'manager@hotel.co.il' },
    update: { passwordHash: managerHash },
    create: {
      name: 'יוסי כהן',
      email: 'manager@hotel.co.il',
      passwordHash: managerHash,
      role: 'hotel_manager',
      branchId: branch.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'reception@hotel.co.il' },
    update: { passwordHash: receptionHash },
    create: {
      name: 'מיכל דוד',
      email: 'reception@hotel.co.il',
      passwordHash: receptionHash,
      role: 'receptionist',
      branchId: branch.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'manager.tlv@hotel.com' },
    update: { branchId: branchTlv.id },
    create: {
      name: 'אבי שפירו',
      email: 'manager.tlv@hotel.com',
      passwordHash: await bcrypt.hash('Manager123!', 12),
      role: 'hotel_manager',
      branchId: branchTlv.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'manager.jer@hotel.com' },
    update: { branchId: branchJer.id },
    create: {
      name: 'נועה גולן',
      email: 'manager.jer@hotel.com',
      passwordHash: await bcrypt.hash('Manager123!', 12),
      role: 'hotel_manager',
      branchId: branchJer.id,
    },
  });

  console.log('✓ Seed complete — 3 branches, 5 users');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
