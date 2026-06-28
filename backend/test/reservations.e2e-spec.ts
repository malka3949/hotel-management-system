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

interface ReservationData {
  id: string;
  status: string;
  totalPrice: string;
  adults: number;
  children: number;
  source: string;
}

describe('Reservations (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let branchId: string;
  let branchBId: string;
  let managerId: string;
  let receptionId: string;
  let managerBId: string;
  let roomId: string;
  let room2Id: string;
  let guestId: string;
  let guest2Id: string;
  let roomTypeId: string;

  const MANAGER_EMAIL = 'res-manager@test.hotel';
  const RECEPTION_EMAIL = 'res-reception@test.hotel';
  const MANAGER_B_EMAIL = 'res-manager-b@test.hotel';
  const TEST_PASSWORD = 'TestPass123!';
  const BASE_PRICE = 500;

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

    const branch = await prisma.branch.create({ data: { name: 'Res Branch', address: 'Res St 1' } });
    const branchB = await prisma.branch.create({ data: { name: 'Res Branch B', address: 'Res St 2' } });
    branchId = branch.id;
    branchBId = branchB.id;

    const manager = await prisma.user.create({
      data: { name: 'Res Manager', email: MANAGER_EMAIL, passwordHash: hash, role: 'hotel_manager', branchId },
    });
    const reception = await prisma.user.create({
      data: { name: 'Res Reception', email: RECEPTION_EMAIL, passwordHash: hash, role: 'receptionist', branchId },
    });
    const managerB = await prisma.user.create({
      data: { name: 'Res Manager B', email: MANAGER_B_EMAIL, passwordHash: hash, role: 'hotel_manager', branchId: branchBId },
    });
    managerId = manager.id;
    receptionId = reception.id;
    managerBId = managerB.id;

    const roomType = await prisma.roomType.create({
      data: { branchId, name: 'Standard Res', basePrice: BASE_PRICE, maxOccupancy: 2 },
    });
    roomTypeId = roomType.id;

    const room = await prisma.room.create({
      data: { branchId, roomTypeId: roomType.id, number: 'R101', floor: 1 },
    });
    const room2 = await prisma.room.create({
      data: { branchId, roomTypeId: roomType.id, number: 'R102', floor: 1 },
    });
    roomId = room.id;
    room2Id = room2.id;

    const guest = await prisma.guest.create({
      data: { branchId, fullName: 'אורח הזמנות', phone: '050-5550001' },
    });
    const guest2 = await prisma.guest.create({
      data: { branchId, fullName: 'אורח שני', phone: '050-5550002' },
    });
    guestId = guest.id;
    guest2Id = guest2.id;
  });

  afterAll(async () => {
    await prisma.reservation.deleteMany({ where: { branchId: { in: [branchId, branchBId] } } });
    await prisma.room.deleteMany({ where: { branchId: { in: [branchId, branchBId] } } });
    await prisma.roomType.deleteMany({ where: { branchId: { in: [branchId, branchBId] } } });
    await prisma.guest.deleteMany({ where: { branchId: { in: [branchId, branchBId] } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: [managerId, receptionId, managerBId] } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: [managerId, receptionId, managerBId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [managerId, receptionId, managerBId] } } });
    await prisma.branch.deleteMany({ where: { id: { in: [branchId, branchBId] } } });
    await app.close();
  });

  // ── helpers ──────────────────────────────────────────────────────────────

  async function getCsrf(agent: request.Agent): Promise<string> {
    const res = await agent.get('/api/v1/auth/csrf');
    return (res.body as ApiResponse<{ csrfToken: string }>).data!.csrfToken;
  }

  async function loginAs(email: string) {
    const agent = request.agent(app.getHttpServer());
    const csrf = await getCsrf(agent);
    await agent.post('/api/v1/auth/login').set('X-CSRF-Token', csrf).send({ email, password: TEST_PASSWORD });
    return agent;
  }

  function makePayload(overrides: Partial<{
    roomId: string;
    guestId: string;
    checkInDate: string;
    checkOutDate: string;
    adults: number;
    children: number;
    source: string;
  }> = {}) {
    return {
      roomId: overrides.roomId ?? roomId,
      guestId: overrides.guestId ?? guestId,
      checkInDate: overrides.checkInDate ?? '2027-01-10',
      checkOutDate: overrides.checkOutDate ?? '2027-01-15',
      adults: overrides.adults ?? 2,
      children: overrides.children ?? 0,
      source: overrides.source ?? 'walk_in',
    };
  }

  // ── POST /api/v1/reservations ─────────────────────────────────────────

  describe('POST /api/v1/reservations', () => {
    it('creates reservation and calculates price correctly', async () => {
      const agent = await loginAs(RECEPTION_EMAIL);
      const res = await agent.post('/api/v1/reservations').send(makePayload({
        checkInDate: '2027-02-01',
        checkOutDate: '2027-02-04',
      }));

      expect(res.status).toBe(201);
      const reservation = (res.body as ApiResponse<ReservationData>).data!;
      expect(reservation.status).toBe('pending');
      // 3 nights × 500 = 1500
      expect(parseFloat(reservation.totalPrice)).toBe(3 * BASE_PRICE);

      await prisma.reservation.delete({ where: { id: reservation.id } });
    });

    it('stores adults, children, source correctly', async () => {
      const agent = await loginAs(RECEPTION_EMAIL);
      const res = await agent.post('/api/v1/reservations').send(makePayload({
        checkInDate: '2027-03-01',
        checkOutDate: '2027-03-03',
        adults: 2,
        children: 1,
        source: 'phone',
      }));

      expect(res.status).toBe(201);
      const reservation = (res.body as ApiResponse<ReservationData>).data!;
      expect(reservation.adults).toBe(2);
      expect(reservation.children).toBe(1);
      expect(reservation.source).toBe('phone');

      await prisma.reservation.delete({ where: { id: reservation.id } });
    });

    it('returns 400 when check_out_date <= check_in_date', async () => {
      const agent = await loginAs(RECEPTION_EMAIL);
      const res = await agent.post('/api/v1/reservations').send(makePayload({
        checkInDate: '2027-04-10',
        checkOutDate: '2027-04-10',
      }));
      expect(res.status).toBe(400);
    });

    it('returns 400 when check_out before check_in', async () => {
      const agent = await loginAs(RECEPTION_EMAIL);
      const res = await agent.post('/api/v1/reservations').send(makePayload({
        checkInDate: '2027-04-15',
        checkOutDate: '2027-04-10',
      }));
      expect(res.status).toBe(400);
    });

    it('returns 409 ROOM_CONFLICT when dates overlap existing confirmed reservation', async () => {
      const agent = await loginAs(RECEPTION_EMAIL);

      const first = await agent.post('/api/v1/reservations').send(makePayload({
        checkInDate: '2027-05-01',
        checkOutDate: '2027-05-07',
      }));
      expect(first.status).toBe(201);
      const firstRes = (first.body as ApiResponse<ReservationData>).data!;

      // Confirm it so it blocks availability
      await prisma.reservation.update({ where: { id: firstRes.id }, data: { status: 'confirmed' } });

      const conflict = await agent.post('/api/v1/reservations').send(makePayload({
        checkInDate: '2027-05-03',
        checkOutDate: '2027-05-08',
      }));
      expect(conflict.status).toBe(409);

      await prisma.reservation.delete({ where: { id: firstRes.id } });
    });

    it('allows booking same room after same-day turnover', async () => {
      const agent = await loginAs(RECEPTION_EMAIL);

      const first = await agent.post('/api/v1/reservations').send(makePayload({
        roomId: room2Id,
        checkInDate: '2027-06-01',
        checkOutDate: '2027-06-05',
      }));
      expect(first.status).toBe(201);
      const firstRes = (first.body as ApiResponse<ReservationData>).data!;
      await prisma.reservation.update({ where: { id: firstRes.id }, data: { status: 'confirmed' } });

      const second = await agent.post('/api/v1/reservations').send(makePayload({
        roomId: room2Id,
        checkInDate: '2027-06-05',
        checkOutDate: '2027-06-08',
      }));
      expect(second.status).toBe(201);
      const secondRes = (second.body as ApiResponse<ReservationData>).data!;

      await prisma.reservation.deleteMany({ where: { id: { in: [firstRes.id, secondRes.id] } } });
    });

    it('returns 401 without authentication', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/reservations')
        .send(makePayload({ checkInDate: '2027-07-01', checkOutDate: '2027-07-05' }));
      expect(res.status).toBe(401);
    });
  });

  // ── Concurrent overbooking prevention ────────────────────────────────

  describe('Concurrent overbooking prevention', () => {
    it('only one of two concurrent requests for same room/dates succeeds', async () => {
      const agent1 = await loginAs(RECEPTION_EMAIL);
      const agent2 = await loginAs(MANAGER_EMAIL);

      const payload = makePayload({
        checkInDate: '2027-08-01',
        checkOutDate: '2027-08-05',
      });

      const [res1, res2] = await Promise.all([
        agent1.post('/api/v1/reservations').send(payload),
        agent2.post('/api/v1/reservations').send(payload),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses[0]).toBe(201);
      expect(statuses[1]).toBe(409);

      const successRes = res1.status === 201 ? res1 : res2;
      const createdId = (successRes.body as ApiResponse<ReservationData>).data!.id;
      await prisma.reservation.delete({ where: { id: createdId } });
    });
  });

  // ── GET /api/v1/reservations ──────────────────────────────────────────

  describe('GET /api/v1/reservations', () => {
    let resId: string;

    beforeAll(async () => {
      const res = await prisma.reservation.create({
        data: {
          branchId,
          roomId,
          guestId,
          checkInDate: new Date('2027-09-01'),
          checkOutDate: new Date('2027-09-05'),
          status: 'confirmed',
          totalPrice: 2000,
          createdBy: managerId,
        },
      });
      resId = res.id;
    });

    afterAll(async () => {
      await prisma.reservation.delete({ where: { id: resId } });
    });

    it('returns list of reservations', async () => {
      const agent = await loginAs(RECEPTION_EMAIL);
      const res = await agent.get('/api/v1/reservations');
      expect(res.status).toBe(200);
      const body = (res.body as ApiResponse<{ items: ReservationData[]; total: number }>).data!;
      expect(body.items.length).toBeGreaterThan(0);
      expect(body.total).toBeGreaterThan(0);
    });

    it('filters by status', async () => {
      const agent = await loginAs(RECEPTION_EMAIL);
      const res = await agent.get('/api/v1/reservations?status=confirmed');
      expect(res.status).toBe(200);
      const body = (res.body as ApiResponse<{ items: ReservationData[] }>).data!;
      body.items.forEach((r) => expect(r.status).toBe('confirmed'));
    });
  });

  // ── GET /api/v1/reservations/:id ────────────────────────────────────

  describe('GET /api/v1/reservations/:id', () => {
    let resId: string;

    beforeAll(async () => {
      const res = await prisma.reservation.create({
        data: {
          branchId,
          roomId,
          guestId,
          checkInDate: new Date('2027-10-01'),
          checkOutDate: new Date('2027-10-04'),
          status: 'pending',
          totalPrice: 1500,
          createdBy: managerId,
        },
      });
      resId = res.id;
    });

    afterAll(async () => {
      await prisma.reservation.delete({ where: { id: resId } });
    });

    it('returns full reservation detail', async () => {
      const agent = await loginAs(RECEPTION_EMAIL);
      const res = await agent.get(`/api/v1/reservations/${resId}`);
      expect(res.status).toBe(200);
      const data = (res.body as ApiResponse<{ id: string; guest: object; room: object }>).data!;
      expect(data.id).toBe(resId);
      expect(data.guest).toBeDefined();
      expect(data.room).toBeDefined();
    });

    it('returns 403 when manager from different branch tries to access', async () => {
      const agent = await loginAs(MANAGER_B_EMAIL);
      const res = await agent.get(`/api/v1/reservations/${resId}`);
      expect(res.status).toBe(403);
    });
  });

  // ── PATCH /api/v1/reservations/:id/status ────────────────────────────

  describe('PATCH /api/v1/reservations/:id/status', () => {
    let resId: string;

    beforeEach(async () => {
      const res = await prisma.reservation.create({
        data: {
          branchId,
          roomId: room2Id,
          guestId: guest2Id,
          checkInDate: new Date('2027-11-01'),
          checkOutDate: new Date('2027-11-03'),
          status: 'pending',
          totalPrice: 1000,
          createdBy: managerId,
        },
      });
      resId = res.id;
    });

    afterEach(async () => {
      await prisma.reservation.deleteMany({ where: { id: resId } });
    });

    it('valid transition: pending → confirmed', async () => {
      const agent = await loginAs(MANAGER_EMAIL);
      const res = await agent.patch(`/api/v1/reservations/${resId}/status`).send({ status: 'confirmed' });
      expect(res.status).toBe(200);
      expect((res.body as ApiResponse<ReservationData>).data!.status).toBe('confirmed');
    });

    it('invalid transition: pending → checked_in → 400', async () => {
      const agent = await loginAs(MANAGER_EMAIL);
      const res = await agent.patch(`/api/v1/reservations/${resId}/status`).send({ status: 'checked_in' });
      expect(res.status).toBe(400);
    });

    it('invalid transition: checked_out → confirmed → 400', async () => {
      await prisma.reservation.update({ where: { id: resId }, data: { status: 'checked_out' } });
      const agent = await loginAs(MANAGER_EMAIL);
      const res = await agent.patch(`/api/v1/reservations/${resId}/status`).send({ status: 'confirmed' });
      expect(res.status).toBe(400);
    });

    it('writes audit log on status change', async () => {
      const agent = await loginAs(MANAGER_EMAIL);
      await agent.patch(`/api/v1/reservations/${resId}/status`).send({ status: 'confirmed' });

      const log = await prisma.auditLog.findFirst({
        where: { action: 'RESERVATION_STATUS_CHANGED', entityId: resId },
      });
      expect(log).toBeTruthy();
      expect((log!.metadata as { to: string }).to).toBe('confirmed');
    });
  });

  // ── POST /api/v1/reservations/:id/cancel ─────────────────────────────

  describe('POST /api/v1/reservations/:id/cancel', () => {
    let resId: string;

    beforeEach(async () => {
      const res = await prisma.reservation.create({
        data: {
          branchId,
          roomId,
          guestId,
          checkInDate: new Date('2027-12-01'),
          checkOutDate: new Date('2027-12-03'),
          status: 'confirmed',
          totalPrice: 1000,
          createdBy: managerId,
        },
      });
      resId = res.id;
    });

    afterEach(async () => {
      await prisma.reservation.deleteMany({ where: { id: resId } });
    });

    it('cancels reservation and records reason', async () => {
      const agent = await loginAs(MANAGER_EMAIL);
      const res = await agent.post(`/api/v1/reservations/${resId}/cancel`).send({ reason: 'בקשת לקוח' });
      expect(res.status).toBe(201);
      const data = (res.body as ApiResponse<{ status: string; cancellationReason: string }>).data!;
      expect(data.status).toBe('cancelled');
      expect(data.cancellationReason).toBe('בקשת לקוח');
    });

    it('cancelled reservation frees room for re-booking', async () => {
      const agent = await loginAs(RECEPTION_EMAIL);
      await agent.post(`/api/v1/reservations/${resId}/cancel`).send({ reason: 'בדיקה' });

      // Should be able to book the same room for same dates now
      const newRes = await agent.post('/api/v1/reservations').send(makePayload({
        checkInDate: '2027-12-01',
        checkOutDate: '2027-12-03',
      }));
      expect(newRes.status).toBe(201);
      const newId = (newRes.body as ApiResponse<ReservationData>).data!.id;
      await prisma.reservation.delete({ where: { id: newId } });
    });

    it('cannot cancel already checked_out reservation', async () => {
      await prisma.reservation.update({ where: { id: resId }, data: { status: 'checked_out' } });
      const agent = await loginAs(MANAGER_EMAIL);
      const res = await agent.post(`/api/v1/reservations/${resId}/cancel`).send({ reason: 'בדיקה' });
      expect(res.status).toBe(400);
    });

    it('writes audit log on cancellation', async () => {
      const agent = await loginAs(MANAGER_EMAIL);
      await agent.post(`/api/v1/reservations/${resId}/cancel`).send({ reason: 'סיבת ביטול' });
      const log = await prisma.auditLog.findFirst({
        where: { action: 'RESERVATION_CANCELLED', entityId: resId },
      });
      expect(log).toBeTruthy();
    });
  });

  // ── Branch isolation ──────────────────────────────────────────────────

  describe('Branch isolation', () => {
    it('manager from branch B cannot see reservations of branch A', async () => {
      const resA = await prisma.reservation.create({
        data: {
          branchId,
          roomId,
          guestId,
          checkInDate: new Date('2028-01-01'),
          checkOutDate: new Date('2028-01-04'),
          status: 'pending',
          totalPrice: 1500,
          createdBy: managerId,
        },
      });

      const agentB = await loginAs(MANAGER_B_EMAIL);
      const listRes = await agentB.get('/api/v1/reservations');
      expect(listRes.status).toBe(200);
      const items = (listRes.body as ApiResponse<{ items: { id: string }[] }>).data!.items;
      expect(items.some((r) => r.id === resA.id)).toBe(false);

      const detailRes = await agentB.get(`/api/v1/reservations/${resA.id}`);
      expect(detailRes.status).toBe(403);

      await prisma.reservation.delete({ where: { id: resA.id } });
    });
  });

  // ── GET /api/v1/reservations/calendar ────────────────────────────────

  describe('GET /api/v1/reservations/calendar', () => {
    let resId: string;

    beforeAll(async () => {
      const res = await prisma.reservation.create({
        data: {
          branchId,
          roomId,
          guestId,
          checkInDate: new Date('2028-02-10'),
          checkOutDate: new Date('2028-02-15'),
          status: 'confirmed',
          totalPrice: 2500,
          createdBy: managerId,
        },
      });
      resId = res.id;
    });

    afterAll(async () => {
      await prisma.reservation.delete({ where: { id: resId } });
    });

    it('returns reservations overlapping date range', async () => {
      const agent = await loginAs(RECEPTION_EMAIL);
      const res = await agent.get(
        `/api/v1/reservations/calendar?dateFrom=2028-02-01&dateTo=2028-02-28`,
      );
      expect(res.status).toBe(200);
      const items = (res.body as ApiResponse<{ id: string }[]>).data!;
      expect(items.some((r) => r.id === resId)).toBe(true);
    });

    it('does NOT return cancelled reservations', async () => {
      const cancelled = await prisma.reservation.create({
        data: {
          branchId,
          roomId: room2Id,
          guestId,
          checkInDate: new Date('2028-02-12'),
          checkOutDate: new Date('2028-02-14'),
          status: 'cancelled',
          totalPrice: 1000,
          createdBy: managerId,
        },
      });

      const agent = await loginAs(RECEPTION_EMAIL);
      const res = await agent.get(
        `/api/v1/reservations/calendar?dateFrom=2028-02-01&dateTo=2028-02-28`,
      );
      const items = (res.body as ApiResponse<{ id: string }[]>).data!;
      expect(items.some((r) => r.id === cancelled.id)).toBe(false);

      await prisma.reservation.delete({ where: { id: cancelled.id } });
    });
  });

  // ── GET /api/v1/rooms/:id/reservations ───────────────────────────────

  describe('GET /api/v1/rooms/:id/reservations', () => {
    let resId: string;

    beforeAll(async () => {
      const res = await prisma.reservation.create({
        data: {
          branchId,
          roomId,
          guestId,
          checkInDate: new Date('2028-03-01'),
          checkOutDate: new Date('2028-03-05'),
          status: 'pending',
          totalPrice: 2000,
          createdBy: managerId,
        },
      });
      resId = res.id;
    });

    afterAll(async () => {
      await prisma.reservation.delete({ where: { id: resId } });
    });

    it('returns reservations for a specific room', async () => {
      const agent = await loginAs(RECEPTION_EMAIL);
      const res = await agent.get(`/api/v1/rooms/${roomId}/reservations`);
      expect(res.status).toBe(200);
      const items = (res.body as ApiResponse<{ id: string }[]>).data!;
      expect(items.some((r) => r.id === resId)).toBe(true);
    });
  });

  // ── GET /api/v1/guests/:id/reservations ──────────────────────────────

  describe('GET /api/v1/guests/:id/reservations', () => {
    let resId: string;

    beforeAll(async () => {
      const res = await prisma.reservation.create({
        data: {
          branchId,
          roomId,
          guestId,
          checkInDate: new Date('2028-04-01'),
          checkOutDate: new Date('2028-04-03'),
          status: 'pending',
          totalPrice: 1000,
          createdBy: managerId,
        },
      });
      resId = res.id;
    });

    afterAll(async () => {
      await prisma.reservation.delete({ where: { id: resId } });
    });

    it('returns reservations for a specific guest', async () => {
      const agent = await loginAs(RECEPTION_EMAIL);
      const res = await agent.get(`/api/v1/guests/${guestId}/reservations`);
      expect(res.status).toBe(200);
      const items = (res.body as ApiResponse<{ id: string }[]>).data!;
      expect(items.some((r) => r.id === resId)).toBe(true);
    });
  });

  // ── Audit log ────────────────────────────────────────────────────────

  describe('Audit log', () => {
    it('writes audit log on reservation creation', async () => {
      const agent = await loginAs(RECEPTION_EMAIL);
      const res = await agent.post('/api/v1/reservations').send(makePayload({
        checkInDate: '2028-05-01',
        checkOutDate: '2028-05-03',
      }));
      expect(res.status).toBe(201);
      const data = (res.body as ApiResponse<ReservationData>).data!;

      const log = await prisma.auditLog.findFirst({
        where: { action: 'RESERVATION_CREATED', entityId: data.id },
      });
      expect(log).toBeTruthy();

      await prisma.reservation.delete({ where: { id: data.id } });
    });
  });

  // ── Unused variable suppression ───────────────────────────────────────
  void roomTypeId;
  void receptionId;
});
