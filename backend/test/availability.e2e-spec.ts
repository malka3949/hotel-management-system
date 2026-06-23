import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import * as bcrypt from 'bcrypt';
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

describe('Availability (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let branchId: string;
  let branchBId: string;
  let managerId: string;
  let receptionId: string;
  let roomId: string;
  let roomMaintId: string;
  let roomOooId: string;
  let guestId: string;

  const MANAGER_EMAIL = 'avail-manager@test.hotel';
  const RECEPTION_EMAIL = 'avail-reception@test.hotel';
  const TEST_PASSWORD = 'TestPass123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await prisma.$executeRawUnsafe('DROP RULE IF EXISTS no_update_audit_logs ON audit_logs');
    await prisma.$executeRawUnsafe('DROP RULE IF EXISTS no_delete_audit_logs ON audit_logs');

    const hash = await bcrypt.hash(TEST_PASSWORD, 12);

    const branch = await prisma.branch.create({ data: { name: 'Avail Branch', address: 'Avail St 1' } });
    const branchB = await prisma.branch.create({ data: { name: 'Avail Branch B', address: 'Avail St 2' } });
    branchId = branch.id;
    branchBId = branchB.id;

    const manager = await prisma.user.create({
      data: { name: 'Avail Manager', email: MANAGER_EMAIL, passwordHash: hash, role: 'hotel_manager', branchId },
    });
    const reception = await prisma.user.create({
      data: { name: 'Avail Reception', email: RECEPTION_EMAIL, passwordHash: hash, role: 'receptionist', branchId },
    });
    managerId = manager.id;
    receptionId = reception.id;

    const roomType = await prisma.roomType.create({
      data: { branchId, name: 'Standard', basePrice: 300, maxOccupancy: 2 },
    });

    const room = await prisma.room.create({
      data: { branchId, roomTypeId: roomType.id, number: '101', floor: 1 },
    });
    const roomMaint = await prisma.room.create({
      data: { branchId, roomTypeId: roomType.id, number: '102', floor: 1, status: 'maintenance' },
    });
    const roomOoo = await prisma.room.create({
      data: { branchId, roomTypeId: roomType.id, number: '103', floor: 1, status: 'out_of_order' },
    });
    roomId = room.id;
    roomMaintId = roomMaint.id;
    roomOooId = roomOoo.id;

    const guest = await prisma.guest.create({
      data: { branchId, fullName: 'אורח בדיקה', phone: '050-0000001' },
    });
    guestId = guest.id;
  });

  afterAll(async () => {
    await prisma.reservation.deleteMany({ where: { branchId: { in: [branchId, branchBId] } } });
    await prisma.room.deleteMany({ where: { branchId: { in: [branchId, branchBId] } } });
    await prisma.roomType.deleteMany({ where: { branchId: { in: [branchId, branchBId] } } });
    await prisma.guest.deleteMany({ where: { branchId: { in: [branchId, branchBId] } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: [managerId, receptionId] } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: [managerId, receptionId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [managerId, receptionId] } } });
    await prisma.branch.deleteMany({ where: { id: { in: [branchId, branchBId] } } });
    await app.close();
  });

  // ── helpers ──────────────────────────────────────────────────────────

  async function getCsrf(agent: request.Agent): Promise<string> {
    const res = await agent.get('/api/v1/auth/csrf');
    expect(res.status).toBe(200);
    return (res.body as ApiResponse<{ csrfToken: string }>).data!.csrfToken;
  }

  async function loginAs(email: string) {
    const agent = request.agent(app.getHttpServer());
    const csrf = await getCsrf(agent);
    await agent.post('/api/v1/auth/login').set('X-CSRF-Token', csrf).send({ email, password: TEST_PASSWORD });
    return agent;
  }

  async function seedReservation(overrides: Partial<{
    roomId: string;
    checkInDate: Date;
    checkOutDate: Date;
    status: string;
  }> = {}) {
    return prisma.reservation.create({
      data: {
        branchId,
        roomId: overrides.roomId ?? roomId,
        guestId,
        checkInDate: overrides.checkInDate ?? new Date('2026-08-10'),
        checkOutDate: overrides.checkOutDate ?? new Date('2026-08-15'),
        status: (overrides.status as never) ?? 'confirmed',
        totalPrice: 1500,
        createdBy: managerId,
      },
    });
  }

  // ── GET /api/v1/availability ──────────────────────────────────────────

  describe('GET /api/v1/availability', () => {
    it('returns available rooms when no reservations exist', async () => {
      const agent = await loginAs(RECEPTION_EMAIL);
      const res = await agent.get(
        `/api/v1/availability?branchId=${branchId}&checkIn=2026-07-01&checkOut=2026-07-05`,
      );
      expect(res.status).toBe(200);
      const rooms = (res.body as ApiResponse<{ id: string }[]>).data!;
      expect(rooms.some((r) => r.id === roomId)).toBe(true);
    });

    it('excludes room with overlapping confirmed reservation', async () => {
      const res = await seedReservation({
        checkInDate: new Date('2026-09-10'),
        checkOutDate: new Date('2026-09-15'),
        status: 'confirmed',
      });
      const agent = await loginAs(RECEPTION_EMAIL);

      const avail = await agent.get(
        `/api/v1/availability?branchId=${branchId}&checkIn=2026-09-12&checkOut=2026-09-14`,
      );
      expect(avail.status).toBe(200);
      const rooms = (avail.body as ApiResponse<{ id: string }[]>).data!;
      expect(rooms.some((r) => r.id === roomId)).toBe(false);

      await prisma.reservation.delete({ where: { id: res.id } });
    });

    it('same-day turnover: allows check-in on day of check-out', async () => {
      const res = await seedReservation({
        checkInDate: new Date('2026-10-01'),
        checkOutDate: new Date('2026-10-05'),
        status: 'confirmed',
      });
      const agent = await loginAs(RECEPTION_EMAIL);

      // New reservation starts exactly when old one ends
      const avail = await agent.get(
        `/api/v1/availability?branchId=${branchId}&checkIn=2026-10-05&checkOut=2026-10-08`,
      );
      expect(avail.status).toBe(200);
      const rooms = (avail.body as ApiResponse<{ id: string }[]>).data!;
      expect(rooms.some((r) => r.id === roomId)).toBe(true);

      await prisma.reservation.delete({ where: { id: res.id } });
    });

    it('excludes rooms in maintenance and out_of_order status', async () => {
      const agent = await loginAs(RECEPTION_EMAIL);
      const res = await agent.get(
        `/api/v1/availability?branchId=${branchId}&checkIn=2026-07-01&checkOut=2026-07-05`,
      );
      expect(res.status).toBe(200);
      const rooms = (res.body as ApiResponse<{ id: string }[]>).data!;
      expect(rooms.some((r) => r.id === roomMaintId)).toBe(false);
      expect(rooms.some((r) => r.id === roomOooId)).toBe(false);
    });

    it('cancelled reservation does NOT block availability', async () => {
      const res = await seedReservation({
        checkInDate: new Date('2026-11-01'),
        checkOutDate: new Date('2026-11-05'),
        status: 'cancelled',
      });
      const agent = await loginAs(RECEPTION_EMAIL);

      const avail = await agent.get(
        `/api/v1/availability?branchId=${branchId}&checkIn=2026-11-02&checkOut=2026-11-04`,
      );
      expect(avail.status).toBe(200);
      const rooms = (avail.body as ApiResponse<{ id: string }[]>).data!;
      expect(rooms.some((r) => r.id === roomId)).toBe(true);

      await prisma.reservation.delete({ where: { id: res.id } });
    });

    it('returns 403 when receptionist queries another branch', async () => {
      const agent = await loginAs(RECEPTION_EMAIL);
      const res = await agent.get(
        `/api/v1/availability?branchId=${branchBId}&checkIn=2026-07-01&checkOut=2026-07-05`,
      );
      expect(res.status).toBe(403);
    });

    it('returns 401 without authentication', async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/v1/availability?branchId=${branchId}&checkIn=2026-07-01&checkOut=2026-07-05`,
      );
      expect(res.status).toBe(401);
    });
  });

  // ── GET /api/v1/availability/summary ─────────────────────────────────

  describe('GET /api/v1/availability/summary', () => {
    it('returns correct occupancy counts', async () => {
      const res = await seedReservation({
        checkInDate: new Date('2026-12-01'),
        checkOutDate: new Date('2026-12-05'),
        status: 'checked_in',
      });
      const agent = await loginAs(MANAGER_EMAIL);

      const summary = await agent.get(
        `/api/v1/availability/summary?branchId=${branchId}&date=2026-12-02`,
      );
      expect(summary.status).toBe(200);
      const data = (summary.body as ApiResponse<{
        total: number;
        occupied: number;
        maintenance: number;
      }>).data!;
      expect(data.total).toBe(3); // room101 + room102 + room103
      expect(data.occupied).toBe(1);
      expect(data.maintenance).toBe(2); // room102 (maintenance) + room103 (out_of_order)

      await prisma.reservation.delete({ where: { id: res.id } });
    });

    it('returns 403 when querying another branch', async () => {
      const agent = await loginAs(RECEPTION_EMAIL);
      const res = await agent.get(
        `/api/v1/availability/summary?branchId=${branchBId}&date=2026-07-01`,
      );
      expect(res.status).toBe(403);
    });
  });
});
