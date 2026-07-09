import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

describe('Reports (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let branchId: string;
  let branchBId: string;
  let managerId: string;
  let adminId: string;
  let roomId: string;
  let roomBId: string;

  const MANAGER_EMAIL = 'rpt-manager@test.hotel';
  const ADMIN_EMAIL = 'rpt-admin@test.hotel';
  const TEST_PASSWORD = 'TestPass123!';

  let managerToken: string;
  let adminToken: string;

  const login = async (email: string): Promise<string> => {
    const csrfRes = await request(app.getHttpServer()).get('/api/v1/auth/csrf').expect(200);
    const csrf = (csrfRes.body as ApiResponse<{ csrfToken: string }>).data?.csrfToken ?? '';
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', csrf)
      .send({ email, password: TEST_PASSWORD })
      .expect(200);
    return (res.body as ApiResponse<{ accessToken: string }>).data?.accessToken ?? '';
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication({ rawBody: true });
    app.use(helmet());
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();

    prisma = module.get<PrismaService>(PrismaService);

    await prisma.$executeRawUnsafe('DROP RULE IF EXISTS no_update_audit_logs ON audit_logs');
    await prisma.$executeRawUnsafe('DROP RULE IF EXISTS no_delete_audit_logs ON audit_logs');

    const hash = await bcrypt.hash(TEST_PASSWORD, 12);

    const branch = await prisma.branch.create({ data: { name: 'RPT Branch A', address: 'RPT St 1' } });
    branchId = branch.id;

    const branchB = await prisma.branch.create({ data: { name: 'RPT Branch B', address: 'RPT St 2' } });
    branchBId = branchB.id;

    const manager = await prisma.user.create({
      data: { name: 'RPT Manager', email: MANAGER_EMAIL, passwordHash: hash, role: 'hotel_manager', branchId },
    });
    managerId = manager.id;

    const admin = await prisma.user.create({
      data: { name: 'RPT Admin', email: ADMIN_EMAIL, passwordHash: hash, role: 'chain_admin', branchId: null },
    });
    adminId = admin.id;

    const roomType = await prisma.roomType.create({
      data: { branchId, name: 'Standard', basePrice: 500, maxOccupancy: 2 },
    });
    const room = await prisma.room.create({
      data: { branchId, roomTypeId: roomType.id, number: 'RPT101', floor: 1, status: 'occupied' },
    });
    roomId = room.id;

    const roomTypeB = await prisma.roomType.create({
      data: { branchId: branchBId, name: 'Standard', basePrice: 400, maxOccupancy: 2 },
    });
    const roomB = await prisma.room.create({
      data: { branchId: branchBId, roomTypeId: roomTypeB.id, number: 'RPT201', floor: 2 },
    });
    roomBId = roomB.id;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 86400000);
    const yesterday = new Date(today.getTime() - 86400000);
    const nextWeek = new Date(today.getTime() + 7 * 86400000);
    const nextMonth = new Date(today.getTime() + 35 * 86400000);

    const guest = await prisma.guest.create({
      data: { branchId, fullName: 'RPT Guest', phone: '0501111111', passportId: 'RPT001' },
    });

    // Active reservation: checked-in today
    const activeRes = await prisma.reservation.create({
      data: {
        branchId,
        roomId,
        guestId: guest.id,
        checkInDate: today,
        checkOutDate: tomorrow,
        status: 'checked_in',
        totalPrice: 500,
        createdBy: managerId,
      },
    });

    // Future reservation: confirmed next week
    await prisma.reservation.create({
      data: {
        branchId,
        roomId,
        guestId: guest.id,
        checkInDate: nextWeek,
        checkOutDate: new Date(nextWeek.getTime() + 86400000),
        status: 'confirmed',
        totalPrice: 500,
        createdBy: managerId,
      },
    });

    // Cancelled reservation: cancelled yesterday
    await prisma.reservation.create({
      data: {
        branchId,
        roomId,
        guestId: guest.id,
        checkInDate: yesterday,
        checkOutDate: today,
        status: 'cancelled',
        totalPrice: 300,
        cancelledAt: yesterday,
        cancellationReason: 'Guest request',
        createdBy: managerId,
      },
    });

    // Out of range reservation for cross-branch
    await prisma.reservation.create({
      data: {
        branchId,
        roomId,
        guestId: guest.id,
        checkInDate: nextMonth,
        checkOutDate: new Date(nextMonth.getTime() + 86400000),
        status: 'confirmed',
        totalPrice: 600,
        createdBy: managerId,
      },
    });

    // Invoice for revenue test
    await prisma.invoice.create({
      data: {
        reservationId: activeRes.id,
        branchId,
        guestId: guest.id,
        status: 'paid',
        subtotal: 500,
        tax: 85,
        total: 585,
      },
    });

    managerToken = await login(MANAGER_EMAIL);
    adminToken = await login(ADMIN_EMAIL);

    void (managerId && adminId && roomBId);
  });

  afterAll(async () => {
    const branchIds = [branchId, branchBId];
    await prisma.housekeepingTask.deleteMany({ where: { branchId: { in: branchIds } } });
    await prisma.auditLog.deleteMany({ where: { branchId: { in: branchIds } } });
    await prisma.invoiceLineItem.deleteMany({ where: { invoice: { branchId: { in: branchIds } } } });
    await prisma.charge.deleteMany({ where: { invoice: { branchId: { in: branchIds } } } });
    await prisma.payment.deleteMany({ where: { branchId: { in: branchIds } } });
    await prisma.invoice.deleteMany({ where: { branchId: { in: branchIds } } });
    await prisma.guestAccessToken.deleteMany({ where: { reservation: { branchId: { in: branchIds } } } });
    await prisma.onlineCheckIn.deleteMany({ where: { reservation: { branchId: { in: branchIds } } } });
    await prisma.checkIn.deleteMany({ where: { reservation: { branchId: { in: branchIds } } } });
    await prisma.checkOut.deleteMany({ where: { reservation: { branchId: { in: branchIds } } } });
    await prisma.reservation.deleteMany({ where: { branchId: { in: branchIds } } });
    await prisma.guest.deleteMany({ where: { branchId: { in: branchIds } } });
    await prisma.room.deleteMany({ where: { branchId: { in: branchIds } } });
    await prisma.roomType.deleteMany({ where: { branchId: { in: branchIds } } });
    await prisma.refreshToken.deleteMany({ where: { user: { branchId: { in: [...branchIds, null] } } } });
    await prisma.user.deleteMany({ where: { email: { in: [MANAGER_EMAIL, ADMIN_EMAIL] } } });
    await prisma.branch.deleteMany({ where: { id: { in: branchIds } } });
    await app.close();
  });

  // ── Test 1: Occupancy Summary ─────────────────────────────────────────────

  it('GET /reports/occupancy-summary returns room counts', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/reports/occupancy-summary')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    const data = (res.body as ApiResponse<{ total: number; occupied: number; available: number }>).data!;
    expect(data.total).toBeGreaterThanOrEqual(1);
    expect(data.occupied).toBeGreaterThanOrEqual(1);
    expect(typeof data.occupancyPct).toBe('number');
  });

  // ── Test 2: Revenue Summary ───────────────────────────────────────────────

  it('GET /reports/revenue-summary returns numeric fields', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/reports/revenue-summary')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    const data = (res.body as ApiResponse<{ today: number; thisMonth: number; prevMonth: number }>).data!;
    expect(typeof data.today).toBe('number');
    expect(typeof data.thisMonth).toBe('number');
    expect(typeof data.prevMonth).toBe('number');
    expect(data.thisMonth).toBeGreaterThanOrEqual(0);
  });

  // ── Test 3: Arrivals & Departures ─────────────────────────────────────────

  it('GET /reports/arrivals-departures returns today counts', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/reports/arrivals-departures')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    const data = (res.body as ApiResponse<{ arrivalsToday: number; departuresToday: number }>).data!;
    expect(typeof data.arrivalsToday).toBe('number');
    expect(typeof data.departuresToday).toBe('number');
  });

  // ── Test 4: Reservation Pipeline ─────────────────────────────────────────

  it('GET /reports/reservation-pipeline returns 30 data points', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/reports/reservation-pipeline')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    const data = (res.body as ApiResponse<Array<{ date: string; count: number }>>).data!;
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(30);
    expect(typeof data[0].date).toBe('string');
    expect(typeof data[0].count).toBe('number');
  });

  // ── Test 5: Occupancy Trend ───────────────────────────────────────────────

  it('GET /reports/occupancy-trend returns 30 data points with pct', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/reports/occupancy-trend')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    const data = (res.body as ApiResponse<Array<{ date: string; occupancyPct: number; totalRooms: number }>>).data!;
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(30);
    expect(typeof data[0].occupancyPct).toBe('number');
    expect(data[0].totalRooms).toBeGreaterThanOrEqual(1);
  });

  // ── Test 6: Cancellations ─────────────────────────────────────────────────

  it('GET /reports/cancellations returns list and rate', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/reports/cancellations')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    const data = (res.body as ApiResponse<{ totalCancelled: number; cancellationRate: number; items: unknown[] }>).data!;
    expect(typeof data.totalCancelled).toBe('number');
    expect(typeof data.cancellationRate).toBe('number');
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.totalCancelled).toBeGreaterThanOrEqual(1);
  });

  // ── Test 7: Future Reservations ───────────────────────────────────────────

  it('GET /reports/future-reservations returns upcoming reservations', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/reports/future-reservations')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    const data = (res.body as ApiResponse<Array<{ id: string; checkInDate: string }>>).data!;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data[0].id).toBeDefined();
  });

  // ── Test 8: Cross-Branch (chain_admin only) ───────────────────────────────

  it('GET /reports/cross-branch returns 403 for hotel_manager', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/reports/cross-branch')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(403);
  });

  it('GET /reports/cross-branch returns branch list for chain_admin', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/reports/cross-branch')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const data = (res.body as ApiResponse<Array<{ branchId: string; branchName: string; totalRooms: number }>>).data!;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(2);
    const branchAData = data.find((b) => b.branchId === branchId);
    expect(branchAData).toBeDefined();
    expect(branchAData?.totalRooms).toBeGreaterThanOrEqual(1);
    expect(typeof branchAData?.occupancyPct).toBe('number');
  });

  // ── Test 9: CSV Exports ───────────────────────────────────────────────────

  it('GET /reports/export/reservations returns CSV with correct headers', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/reports/export/reservations')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(res.headers['content-type']).toMatch(/text\/csv/);
    const csv = res.text;
    expect(csv).toMatch(/מזהה,תאריך הגעה/);
  });

  it('GET /reports/export/revenue returns CSV', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/reports/export/revenue')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text).toMatch(/מזהה חשבונית/);
  });

  // ── Test 10: Unauthenticated requests ─────────────────────────────────────

  it('GET /reports/occupancy-summary returns 401 without token', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/reports/occupancy-summary')
      .expect(401);
  });
});
