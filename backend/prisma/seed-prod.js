'use strict';
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // ── Branches ──────────────────────────────────────────────────────────────────────────
  const branch = await prisma.branch.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {
      coverPhoto: 'https://res.cloudinary.com/dvnadprsu/image/upload/v1784667008/hotel-management/seed/branch-tlv-center.jpg',
      description: 'מיקום מרכזי עם גישה נוחה לכל אטרקציות תל אביב. עיצוב עכשווי, חדרים מרווחים ושירות חם ואישי.',
      amenities: ['בריכת גג', 'ספא', 'חדר כושר', 'WiFi חינם', 'חניה', 'שירות חדרים 24/7', 'מסעדה', 'בר'],
      cancellationPolicy: 'ביטול חינם עד 48 שעות לפני ההגעה. ביטול מאוחר יותר — חיוב בגובה לילה אחד.',
    },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'מלון מרכז תל אביב',
      address: 'רחוב הרצל 1, תל אביב',
      phone: '03-1234567',
      email: 'tlv@hotel.co.il',
      contactPerson: 'שרה לוי',
      coverPhoto: 'https://res.cloudinary.com/dvnadprsu/image/upload/v1784667008/hotel-management/seed/branch-tlv-center.jpg',
      description: 'מיקום מרכזי עם גישה נוחה לכל אטרקציות תל אביב. עיצוב עכשווי, חדרים מרווחים ושירות חם ואישי.',
      amenities: ['בריכת גג', 'ספא', 'חדר כושר', 'WiFi חינם', 'חניה', 'שירות חדרים 24/7', 'מסעדה', 'בר'],
      cancellationPolicy: 'ביטול חינם עד 48 שעות לפני ההגעה. ביטול מאוחר יותר — חיוב בגובה לילה אחד.',
    },
  });

  const branchTlv = await prisma.branch.upsert({
    where: { id: '9049714c-9180-4b85-a7a2-c75dd18988c2' },
    update: {
      coverPhoto: 'https://res.cloudinary.com/dvnadprsu/image/upload/v1784667010/hotel-management/seed/branch-tlv.jpg',
      description: 'מלון בוטיק יוקרתי במרכז תל אביב, בלב הבולבר הירוק. 5 דקות ממרכזי בידור, מסעדות שף ושופינג. בריכת גג, ספא מלא ושירות קונסיירז׳ 24/7.',
      amenities: ['בריכת גג', 'ספא', 'חדר כושר', 'WiFi חינם', 'חניה', 'שירות חדרים 24/7', 'מסעדת שף', 'בר גג'],
      cancellationPolicy: 'ביטול חינם עד 48 שעות לפני ההגעה. ביטול מאוחר יותר — חיוב בגובה לילה אחד.',
    },
    create: {
      id: '9049714c-9180-4b85-a7a2-c75dd18988c2',
      name: 'מלון תל אביב',
      address: 'רחוב דיזנגוף 50, תל אביב',
      phone: '03-7654321',
      email: 'tlv@hotel.com',
      contactPerson: 'דני לוי',
      coverPhoto: 'https://res.cloudinary.com/dvnadprsu/image/upload/v1784667010/hotel-management/seed/branch-tlv.jpg',
      description: 'מלון בוטיק יוקרתי במרכז תל אביב, בלב הבולבר הירוק. 5 דקות ממרכזי בידור, מסעדות שף ושופינג. בריכת גג, ספא מלא ושירות קונסיירז׳ 24/7.',
      amenities: ['בריכת גג', 'ספא', 'חדר כושר', 'WiFi חינם', 'חניה', 'שירות חדרים 24/7', 'מסעדת שף', 'בר גג'],
      cancellationPolicy: 'ביטול חינם עד 48 שעות לפני ההגעה. ביטול מאוחר יותר — חיוב בגובה לילה אחד.',
    },
  });

  const branchJer = await prisma.branch.upsert({
    where: { id: 'a7688152-ff33-4e4f-8cc4-848500bdb800' },
    update: {
      coverPhoto: 'https://res.cloudinary.com/dvnadprsu/image/upload/v1784667012/hotel-management/seed/branch-jerusalem.jpg',
      description: 'מלון הדגל שלנו בלב העיר העתיקה. נוף מרהיב לחומות ירושלים, ארוחת בוקר ישראלית עשירה, וחדרים שמשלבים אדריכלות מסורתית עם נוחות מודרנית.',
      amenities: ['נוף לחומות', 'ארוחת בוקר', 'WiFi חינם', 'חניה', 'שירות חדרים', 'טרקלין אורחים', 'סיורים מודרכים'],
      cancellationPolicy: 'ביטול חינם עד 72 שעות לפני ההגעה. ביטול מאוחר יותר — חיוב בגובה לילה אחד.',
    },
    create: {
      id: 'a7688152-ff33-4e4f-8cc4-848500bdb800',
      name: 'מלון ירושלים',
      address: 'רחוב יפו 10, ירושלים',
      phone: '02-1234567',
      email: 'jer@hotel.com',
      contactPerson: 'רחל כהן',
      coverPhoto: 'https://res.cloudinary.com/dvnadprsu/image/upload/v1784667012/hotel-management/seed/branch-jerusalem.jpg',
      description: 'מלון הדגל שלנו בלב העיר העתיקה. נוף מרהיב לחומות ירושלים, ארוחת בוקר ישראלית עשירה, וחדרים שמשלבים אדריכלות מסורתית עם נוחות מודרנית.',
      amenities: ['נוף לחומות', 'ארוחת בוקר', 'WiFi חינם', 'חניה', 'שירות חדרים', 'טרקלין אורחים', 'סיורים מודרכים'],
      cancellationPolicy: 'ביטול חינם עד 72 שעות לפני ההגעה. ביטול מאוחר יותר — חיוב בגובה לילה אחד.',
    },
  });

  // ── Users ────────────────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin123!', 12);
  const managerHash = await bcrypt.hash('Manager123!', 12);
  const receptionHash = await bcrypt.hash('Reception123!', 12);

  await prisma.user.upsert({ where: { email: 'admin@hotel.co.il' }, update: { passwordHash: adminHash }, create: { name: 'מנהל מערכת', email: 'admin@hotel.co.il', passwordHash: adminHash, role: 'chain_admin', branchId: null } });
  await prisma.user.upsert({ where: { email: 'manager@hotel.co.il' }, update: { passwordHash: managerHash }, create: { name: 'יוסי כהן', email: 'manager@hotel.co.il', passwordHash: managerHash, role: 'hotel_manager', branchId: branch.id } });
  await prisma.user.upsert({ where: { email: 'reception@hotel.co.il' }, update: { passwordHash: receptionHash }, create: { name: 'מיכל דוד', email: 'reception@hotel.co.il', passwordHash: receptionHash, role: 'receptionist', branchId: branch.id } });
  await prisma.user.upsert({ where: { email: 'manager.tlv@hotel.com' }, update: { branchId: branchTlv.id }, create: { name: 'אבי שפירו', email: 'manager.tlv@hotel.com', passwordHash: await bcrypt.hash('Manager123!', 12), role: 'hotel_manager', branchId: branchTlv.id } });
  await prisma.user.upsert({ where: { email: 'manager.jer@hotel.com' }, update: { branchId: branchJer.id }, create: { name: 'נועה גולן', email: 'manager.jer@hotel.com', passwordHash: await bcrypt.hash('Manager123!', 12), role: 'hotel_manager', branchId: branchJer.id } });

  // ── Room Types — Branch 1 ───────────────────────────────────────────────────────────
  const rtCenter01 = await prisma.roomType.upsert({ where: { id: 'rt-center-01' }, update: {}, create: { id: 'rt-center-01', branchId: branch.id, name: 'חדר סטנדרטי', basePrice: 450, maxOccupancy: 2, description: 'חדר מרווח עם מיטה זוגית, מרכז העיר', photos: ['https://res.cloudinary.com/dvnadprsu/image/upload/v1784667013/hotel-management/seed/room-standard-1.jpg'], amenities: ['WiFi', 'מיזוג', 'טלוויזיה'], bedType: 'זוגית', roomSize: 22, maxAdults: 2, maxChildren: 0 } });
  const rtCenter02 = await prisma.roomType.upsert({ where: { id: 'rt-center-02' }, update: {}, create: { id: 'rt-center-02', branchId: branch.id, name: 'חדר עסקים', basePrice: 600, maxOccupancy: 2, description: 'חדר עם שולחן עבודה גדול ונוף לעיר', photos: ['https://res.cloudinary.com/dvnadprsu/image/upload/v1784667015/hotel-management/seed/room-business-1.jpg'], amenities: ['WiFi מהיר', 'מיזוג', 'מקרר', 'כספת'], maxAdults: 2, maxChildren: 0 } });
  const rtCenter03 = await prisma.roomType.upsert({ where: { id: 'rt-center-03' }, update: {}, create: { id: 'rt-center-03', branchId: branch.id, name: 'חדר דלוקס', basePrice: 850, maxOccupancy: 3, description: 'חדר מפואר עם נוף פנורמי למרכז תל אביב', photos: ['https://res.cloudinary.com/dvnadprsu/image/upload/v1784667016/hotel-management/seed/room-deluxe-1.jpg'], amenities: ['WiFi', 'מיזוג', 'אמבטיה', 'מרפסת'], bedType: 'קינג', roomSize: 32, maxAdults: 2, maxChildren: 1 } });
  const rtCenter04 = await prisma.roomType.upsert({ where: { id: 'rt-center-04' }, update: {}, create: { id: 'rt-center-04', branchId: branch.id, name: 'סוויטה', basePrice: 1400, maxOccupancy: 4, description: 'סוויטה יוקרתית עם סלון נפרד ונוף לים', photos: ['https://res.cloudinary.com/dvnadprsu/image/upload/v1784667025/hotel-management/seed/room-suite-3.jpg'], amenities: ['WiFi', 'מיזוג', "ג׳קוזי", 'מרפסת', 'שירות חדרים'], bedType: 'קינג', roomSize: 65, maxAdults: 3, maxChildren: 1 } });

  // ── Room Types — Branch 2 ────────────────────────────────────────────────────────
  const rtTlv01 = await prisma.roomType.upsert({ where: { id: 'dfdf88d3-2fc8-4252-b5e3-d1655c01021b' }, update: {}, create: { id: 'dfdf88d3-2fc8-4252-b5e3-d1655c01021b', branchId: branchTlv.id, name: 'חדר סטנדרטי', basePrice: 350, maxOccupancy: 2, description: 'חדר זוגי, נוף לעיר', photos: ['https://res.cloudinary.com/dvnadprsu/image/upload/v1784667013/hotel-management/seed/room-standard-1.jpg', 'https://res.cloudinary.com/dvnadprsu/image/upload/v1784667014/hotel-management/seed/room-standard-2.jpg'], amenities: ['WiFi', 'מיזוג אוויר', 'טלוויזיה', 'מקלחת'], bedType: 'זוגית', roomSize: 22, maxAdults: 2, maxChildren: 0 } });
  const rtTlv02 = await prisma.roomType.upsert({ where: { id: 'f7f93802-cc7a-4989-a962-53e8d089df04' }, update: {}, create: { id: 'f7f93802-cc7a-4989-a962-53e8d089df04', branchId: branchTlv.id, name: 'חדר דלוקס', basePrice: 550, maxOccupancy: 2, description: 'באלקון ונוף לים', photos: ['https://res.cloudinary.com/dvnadprsu/image/upload/v1784667016/hotel-management/seed/room-deluxe-1.jpg', 'https://res.cloudinary.com/dvnadprsu/image/upload/v1784667018/hotel-management/seed/room-deluxe-2.jpg'], amenities: ['WiFi', 'מיזוג אוויר', 'טלוויזיה 55"', 'אמבטיה', 'מיני בר', 'כספת'], bedType: 'קינג', roomSize: 32, maxAdults: 2, maxChildren: 0 } });
  const rtTlv03 = await prisma.roomType.upsert({ where: { id: 'b90c1724-204a-4aec-9ed4-4a3cbf55a088' }, update: {}, create: { id: 'b90c1724-204a-4aec-9ed4-4a3cbf55a088', branchId: branchTlv.id, name: 'חדר משפחתי', basePrice: 650, maxOccupancy: 4, description: 'שתי חדרי שינה, מטבחון', photos: ['https://res.cloudinary.com/dvnadprsu/image/upload/v1784667015/hotel-management/seed/room-business-1.jpg', 'https://res.cloudinary.com/dvnadprsu/image/upload/v1784667026/hotel-management/seed/room-family-1.jpg'], amenities: ['WiFi', 'מיזוג אוויר', '2 טלוויזיות', 'אמבטיה', 'מיני בר', 'פינת ישיבה'], bedType: 'שתי מיטות', roomSize: 45, maxAdults: 2, maxChildren: 2 } });
  const rtTlv04 = await prisma.roomType.upsert({ where: { id: '3fcacc1b-5296-4b28-94dd-7798e66450f1' }, update: {}, create: { id: '3fcacc1b-5296-4b28-94dd-7798e66450f1', branchId: branchTlv.id, name: "ג׳וניור סוויטה", basePrice: 800, maxOccupancy: 3, description: 'חדר גדול עם ספת נפתחת', photos: ['https://res.cloudinary.com/dvnadprsu/image/upload/v1784667019/hotel-management/seed/room-junior-suite-1.jpg', 'https://res.cloudinary.com/dvnadprsu/image/upload/v1784667021/hotel-management/seed/room-junior-suite-2.jpg'], amenities: ['WiFi', 'מיזוג אוויר', 'טלוויזיה 65"', "ג׳קוזי", 'מיני בר', 'פינת ישיבה', 'חדר רחצה כפול'], maxAdults: 2, maxChildren: 1 } });
  const rtTlv05 = await prisma.roomType.upsert({ where: { id: 'df499fc0-d341-47ca-85c6-bbbe19108a20' }, update: {}, create: { id: 'df499fc0-d341-47ca-85c6-bbbe19108a20', branchId: branchTlv.id, name: 'סוויטה', basePrice: 1200, maxOccupancy: 4, description: "סלון נפרד וג׳קוזי", photos: ['https://res.cloudinary.com/dvnadprsu/image/upload/v1784667022/hotel-management/seed/room-suite-1.jpg', 'https://res.cloudinary.com/dvnadprsu/image/upload/v1784667023/hotel-management/seed/room-suite-2.jpg'], amenities: ['WiFi', 'מיזוג אוויר', 'טלוויזיה 75"', "ג׳קוזי פרטי", 'מיני בר פרמיום', 'פינת ישיבה', 'חדר רחצה כפול', 'מרפסת פרטית', 'שירות חדרים 24/7'], bedType: 'קינג', roomSize: 65, maxAdults: 3, maxChildren: 1 } });

  // ── Room Types — Branch 3 ────────────────────────────────────────────────────────
  const rtJer01 = await prisma.roomType.upsert({ where: { id: 'c49b9945-a973-47eb-a1a5-86507985f9b7' }, update: {}, create: { id: 'c49b9945-a973-47eb-a1a5-86507985f9b7', branchId: branchJer.id, name: 'חדר סטנדרטי', basePrice: 400, maxOccupancy: 2, description: 'נוף לעיר העתיקה', photos: ['https://res.cloudinary.com/dvnadprsu/image/upload/v1784667013/hotel-management/seed/room-standard-1.jpg'], amenities: ['WiFi', 'מיזוג אוויר', 'טלוויזיה', 'מקלחת'], bedType: 'זוגית', roomSize: 22, maxAdults: 2, maxChildren: 0 } });
  const rtJer02 = await prisma.roomType.upsert({ where: { id: '33f9fc3e-8009-4497-b7cf-b33a66c5df96' }, update: {}, create: { id: '33f9fc3e-8009-4497-b7cf-b33a66c5df96', branchId: branchJer.id, name: 'חדר דלוקס', basePrice: 650, maxOccupancy: 2, description: 'נוף לחומות', photos: ['https://res.cloudinary.com/dvnadprsu/image/upload/v1784667016/hotel-management/seed/room-deluxe-1.jpg'], amenities: ['WiFi', 'מיזוג אוויר', 'טלוויזיה 55"', 'אמבטיה', 'מיני בר'], bedType: 'קינג', roomSize: 32, maxAdults: 2, maxChildren: 0 } });
  const rtJer03 = await prisma.roomType.upsert({ where: { id: '26af1730-f2a2-4005-bc3f-f6111a79ff3a' }, update: {}, create: { id: '26af1730-f2a2-4005-bc3f-f6111a79ff3a', branchId: branchJer.id, name: 'חדר משפחתי', basePrice: 750, maxOccupancy: 5, description: 'שלוש מיטות', photos: ['https://res.cloudinary.com/dvnadprsu/image/upload/v1784667015/hotel-management/seed/room-business-1.jpg'], amenities: ['WiFi', 'מיזוג אוויר', '2 טלוויזיות', 'אמבטיה', 'מיני בר'], bedType: 'שתי מיטות', roomSize: 45, maxAdults: 2, maxChildren: 3 } });
  const rtJer04 = await prisma.roomType.upsert({ where: { id: '581b9ce5-d4f4-43a3-abb3-704a39dbf369' }, update: {}, create: { id: '581b9ce5-d4f4-43a3-abb3-704a39dbf369', branchId: branchJer.id, name: 'סוויטה', basePrice: 1400, maxOccupancy: 4, description: 'נוף פנורמי', photos: ['https://res.cloudinary.com/dvnadprsu/image/upload/v1784667022/hotel-management/seed/room-suite-1.jpg'], amenities: ['WiFi', 'מיזוג אוויר', 'טלוויזיה 75"', "ג׳קוזי", 'מרפסת', 'שירות חדרים 24/7'], bedType: 'קינג', roomSize: 65, maxAdults: 3, maxChildren: 1 } });

  // ── Rooms — Branch 1 ────────────────────────────────────────────────────────────────────
  for (const r of [{id:'f5fb3e41-b6fe-4169-9449-d5990cdcbfad',rtId:rtCenter01.id,n:'101',f:1},{id:'dec86aa5-eea5-4c22-b1dd-5e681a246a03',rtId:rtCenter01.id,n:'102',f:1},{id:'e1aeecb1-8716-43c9-ac55-ffb3b1b0199d',rtId:rtCenter01.id,n:'201',f:2},{id:'a4fef1fe-b37d-4567-9024-8026b45eac65',rtId:rtCenter01.id,n:'202',f:2},{id:'f1a18087-6008-4cc3-a4d1-5f034010ec48',rtId:rtCenter02.id,n:'301',f:3},{id:'347db1ff-8bd1-4d56-83f4-a8bd5f1ee624',rtId:rtCenter02.id,n:'302',f:3},{id:'bb91cf8f-b238-43e4-91fa-1572faa5fd28',rtId:rtCenter02.id,n:'401',f:4},{id:'22b1fd91-ecef-4ac8-afa5-94183e9cfe4d',rtId:rtCenter03.id,n:'501',f:5},{id:'6a9d3385-9909-4803-86a8-d93939ffabd3',rtId:rtCenter03.id,n:'502',f:5},{id:'7ab21260-eae4-4139-a0df-0b1bedf68b0e',rtId:rtCenter03.id,n:'601',f:6},{id:'ff1fd852-ae3f-4cff-ac44-7d833e8a3259',rtId:rtCenter04.id,n:'701',f:7},{id:'9d5082cc-19b1-433a-b412-8b974bc000a9',rtId:rtCenter04.id,n:'702',f:7}]) {
    await prisma.room.upsert({ where:{id:r.id}, update:{}, create:{id:r.id,branchId:branch.id,roomTypeId:r.rtId,number:r.n,floor:r.f} });
  }

  // ── Rooms — Branch 2 ────────────────────────────────────────────────────────────────────
  for (const r of [{id:'846f7cc2-6a20-42d6-aa33-a309a6ddca9f',rtId:rtTlv01.id,n:'101',f:1},{id:'d3cd4076-303d-4c60-827e-3e0d1192ac51',rtId:rtTlv01.id,n:'102',f:1},{id:'cc9e3cb5-e527-437f-a9a8-f48f222e34b3',rtId:rtTlv01.id,n:'103',f:1},{id:'7e54cde7-b89e-4a97-acd9-e7c2a487475e',rtId:rtTlv03.id,n:'104',f:1},{id:'2ccf145f-d9d8-4d40-852a-06e7342b3989',rtId:rtTlv01.id,n:'105',f:1},{id:'a5292b9a-277a-41d3-a5c8-734027b2461c',rtId:rtTlv02.id,n:'201',f:2},{id:'38cc4b22-b02e-48d3-86d5-bac3c5799818',rtId:rtTlv02.id,n:'202',f:2},{id:'ee82eb00-5edd-4c65-9c37-80e2b1510333',rtId:rtTlv02.id,n:'203',f:2},{id:'d0d63f24-360c-47ea-8319-0055c817893f',rtId:rtTlv01.id,n:'204',f:2},{id:'c4348c2c-7b4e-4538-b011-6e280ed4d3b0',rtId:rtTlv02.id,n:'205',f:2},{id:'ead60f4b-d7bf-451b-86b8-6cd6e11e313e',rtId:rtTlv04.id,n:'301',f:3},{id:'c6395e4a-d043-4b1e-8e19-e068a40d05cb',rtId:rtTlv04.id,n:'302',f:3},{id:'b8d9c388-e8d6-4302-ae64-4d2fd7345a68',rtId:rtTlv02.id,n:'303',f:3},{id:'c919b759-8d1a-464b-90d6-b36df0f739b8',rtId:rtTlv03.id,n:'304',f:3},{id:'e5c8e870-814a-491b-82cd-c67d32762262',rtId:rtTlv04.id,n:'305',f:3},{id:'5b72c55d-e21d-41e4-8492-ab0eae55d65b',rtId:rtTlv05.id,n:'401',f:4},{id:'e27969c6-1731-4f57-a43b-ab193cd70a53',rtId:rtTlv05.id,n:'402',f:4},{id:'24e1841e-c283-4b6a-8748-4bfa8c67bfb2',rtId:rtTlv04.id,n:'403',f:4},{id:'419a089a-cc23-4047-9182-9b5b79eaf096',rtId:rtTlv02.id,n:'404',f:4},{id:'6a280fcd-4021-4a92-9fba-3286cbb1b7e0',rtId:rtTlv05.id,n:'501',f:5}]) {
    await prisma.room.upsert({ where:{id:r.id}, update:{}, create:{id:r.id,branchId:branchTlv.id,roomTypeId:r.rtId,number:r.n,floor:r.f} });
  }

  // ── Rooms — Branch 3 ────────────────────────────────────────────────────────────────────
  for (const r of [{id:'045edada-68fb-40ae-a139-7064171b36e1',rtId:rtJer01.id,n:'101',f:1},{id:'88eec552-38bd-4203-a23f-d65390fc72fe',rtId:rtJer01.id,n:'102',f:1},{id:'02af1f99-a121-454a-873d-e5982fd1f154',rtId:rtJer03.id,n:'103',f:1},{id:'06151f19-1f07-408d-afa8-9365e80af50a',rtId:rtJer01.id,n:'104',f:1},{id:'b60c6967-9a1b-45d7-8ddc-ac01a03588ab',rtId:rtJer02.id,n:'201',f:2},{id:'d7df2a31-b2f1-4adf-a2eb-066b0a3d72b6',rtId:rtJer02.id,n:'202',f:2},{id:'ac58ea9c-67f5-468e-b34c-4d79a23fa28e',rtId:rtJer02.id,n:'203',f:2},{id:'68ec5534-ef4f-49b5-a79e-a549a43acb37',rtId:rtJer01.id,n:'204',f:2},{id:'3b3386fd-f151-41bc-8245-ee364cc491c1',rtId:rtJer04.id,n:'301',f:3},{id:'b27a0f4e-ae0d-49d4-84aa-31708462e5c6',rtId:rtJer04.id,n:'302',f:3},{id:'e05115b4-e556-4107-ae9a-23228e77e1e2',rtId:rtJer03.id,n:'303',f:3},{id:'6555447d-8a85-40aa-aa42-e6aa82d6a5c0',rtId:rtJer02.id,n:'304',f:3}]) {
    await prisma.room.upsert({ where:{id:r.id}, update:{}, create:{id:r.id,branchId:branchJer.id,roomTypeId:r.rtId,number:r.n,floor:r.f} });
  }

  console.log('✓ Seed complete — 3 branches, 5 users, 13 room types, 44 rooms');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
