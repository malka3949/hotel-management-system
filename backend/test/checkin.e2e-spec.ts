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

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

const dayAfter = () => {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().slice(0, 10);
};

const today = () => new Date().toISOString().slice(0, 10);

describe('CheckIn (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let branchId: string;
  let branchBId: string;
  let managerId: string;
  let managerBId: string;
  let roomId: string;
  let roomTypeId: string;
  let guestId: string;

  const MANAGER_EMAIL = 'ci-manager@test.hotel';
  const MANAGER_B_EMAIL = 'ci-manager-b@test.hotel';
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

    const branch = await prisma.branch.create({ data: { name: 'CI Branch', address: 'CI St 1' } });
    const branchB = await prisma.branch.create({ data: { name: 'CI Branch B', address: 'CI St 2' } });
    branchId = branch.id;
    branchBId = branchB.id;

    const manager = await prisma.user.create({
      data: { name: 'CI Manager', email: MANAGER_EMAIL, passwordHash: hash, role: 'hotel_manager', branchId },
    });
    managerId = manager.id;

    const managerB = await prisma.user.create({
      data: { name: 'CI Manager B', email: MANAGER_B_EMAIL, passwordHash: hash, role: 'hotel_manager', branchId: branchBId },
    });
    managerBId = managerB.id;

    const roomType = await prisma.roomType.create({
      data: { branchId, name: 'Standard', basePrice: 500, maxOccupancy: 2 },
    });
    roomTypeId = roomType.id;

    const room = await prisma.room.create({
      data: { branchId, roomTypeId, number: 'CI101', floor: 1 },
    });
    roomId = room.id;

    const guest = await prisma.guest.create({
      data: { branchId, fullName: 'CI Guest', phone: '0501234567' },
    });
    guestId = guest.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { branchId: { in: [branchId, branchBId] } } });
    await prisma.invoiceLineItem.deleteMany({ where: { invoice: { branchId } } });
    await prisma.invoice.deleteMany({ where: { branchId } });
    await prisma.checkOut.deleteMany({ where: { branchId } });
    await prisma.checkIn.deleteMany({ where: { branchId } });
    await prisma.reservation.deleteMany({ where: { branchId: { in: [branchId, branchBId] } } });
    await prisma.room.deleteMany({ where: { branchId: { in: [branchId, branchBId] } } });
    await prisma.roomType.deleteMany({ where: { branchId: { in: [branchId, branchBId] } } });
    await prisma.guest.deleteMany({ where: { branchId: { in: [branchId, branchBId] } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: [managerId, managerBId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [managerId, managerBId] } } });
    await prisma.branch.deleteMany({ where: { id: { in: [branchId, branchBId] } } });
    await app.close();
  });

  async function loginAs(email: string): Promise<request.Agent> {
    const agent = request.agent(app.getHttpServer());
    const csrfRes = await agent.get('/api/v1/auth/csrf');
    const csrfToken = (csrfRes.body as ApiResponse<{ csrfToken: string }>).data!.csrfToken;
    await agent.post('/api/v1/auth/login').set('X-CSRF-Token', csrfToken).send({ email, password: TEST_PASSWORD });
    return agent;
  }

  describe('POST /api/v1/reservations/:id/check-in', () => {
    it('check-in happy path: confirmed → checked_in, room → occupied, invoice created', async () => {
      const agent = await loginAs(MANAGER_EMAIL);

      // Create reservation directly in DB as confirmed
      const reservation = await prisma.reservation.create({
        data: {
          branchId,
          roomId,
          guestId,
          checkInDate: new Date(today()),
          checkOutDate: new Date(tomorrow()),
          status: 'confirmed',
          totalPrice: 500,
          createdBy: managerId,
          version: 0,
        },
      });

      const res = await agent
        .post(`/api/v1/reservations/${reservation.id}/check-in`)
        .send({ notes: 'הערת בדיקה' });

      expect(res.status).toBe(201);
      const body = res.body as ApiResponse<{ status: string }>;
      expect(body.success).toBe(true);
      expect(body.data!.status).toBe('checked_in');

      const room = await prisma.room.findUnique({ where: { id: roomId } });
      expect(room!.status).toBe('occupied');

      const checkIn = await prisma.checkIn.findUnique({ where: { reservationId: reservation.id } });
      expect(checkIn).not.toBeNull();
      expect(checkIn!.notes).toBe('הערת בדיקה');

      const invoice = await prisma.invoice.findUnique({
        where: { reservationId: reservation.id },
        include: { lineItems: true },
      });
      expect(invoice).not.toBeNull();
      expect(invoice!.status).toBe('draft');
      expect(invoice!.lineItems.length).toBe(1);
      expect(invoice!.lineItems[0].itemType).toBe('room_charge');

      const audit = await prisma.auditLog.findFirst({
        where: { entityId: reservation.id, action: 'CHECK_IN' },
      });
      expect(audit).not.toBeNull();

      // cleanup
      await prisma.invoiceLineItem.deleteMany({ where: { invoiceId: invoice!.id } });
      await prisma.invoice.delete({ where: { id: invoice!.id } });
      await prisma.checkIn.delete({ where: { reservationId: reservation.id } });
      await prisma.reservation.delete({ where: { id: reservation.id } });
      await prisma.room.update({ where: { id: roomId }, data: { status: 'available' } });
    });

    it('fails if reservation is not confirmed (pending → 400)', async () => {
      const agent = await loginAs(MANAGER_EMAIL);

      const reservation = await prisma.reservation.create({
        data: {
          branchId, roomId, guestId,
          checkInDate: new Date(tomorrow()),
          checkOutDate: new Date(dayAfter()),
          status: 'pending',
          totalPrice: 500,
          createdBy: managerId,
          version: 0,
        },
      });

      const res = await agent
        .post(`/api/v1/reservations/${reservation.id}/check-in`)
        .send({});

      expect(res.status).toBe(400);
      await prisma.reservation.delete({ where: { id: reservation.id } });
    });

    it('fails if manager from different branch', async () => {
      const agentB = await loginAs(MANAGER_B_EMAIL);

      const reservation = await prisma.reservation.create({
        data: {
          branchId, roomId, guestId,
          checkInDate: new Date(today()),
          checkOutDate: new Date(tomorrow()),
          status: 'confirmed',
          totalPrice: 500,
          createdBy: managerId,
          version: 0,
        },
      });

      const res = await agentB
        .post(`/api/v1/reservations/${reservation.id}/check-in`)
        .send({});

      expect(res.status).toBe(403);
      await prisma.reservation.delete({ where: { id: reservation.id } });
    });
  });

  describe('POST /api/v1/reservations/:id/check-out', () => {
    it('check-out happy path: checked_in → checked_out, room → available/dirty, invoice finalized', async () => {
      const agent = await loginAs(MANAGER_EMAIL);

      const reservation = await prisma.reservation.create({
        data: {
          branchId, roomId, guestId,
          checkInDate: new Date(today()),
          checkOutDate: new Date(tomorrow()),
          status: 'checked_in',
          totalPrice: 500,
          createdBy: managerId,
          version: 0,
        },
      });

      const invoice = await prisma.invoice.create({
        data: {
          reservationId: reservation.id,
          branchId,
          guestId,
          status: 'draft',
          subtotal: 500,
          tax: 85,
          total: 585,
          lineItems: {
            create: { description: 'לינה', quantity: 1, unitPrice: 500, total: 500, itemType: 'room_charge' },
          },
        },
      });

      const res = await agent
        .post(`/api/v1/reservations/${reservation.id}/check-out`)
        .send({ notes: 'תודה' });

      expect(res.status).toBe(201);
      const body = res.body as ApiResponse<{ reservation: { status: string }; invoice: { status: string; issuedAt: string } }>;
      expect(body.success).toBe(true);
      expect(body.data!.reservation.status).toBe('checked_out');
      expect(body.data!.invoice.status).toBe('finalized');
      expect(body.data!.invoice.issuedAt).not.toBeNull();

      const room = await prisma.room.findUnique({ where: { id: roomId } });
      expect(room!.status).toBe('available');
      expect(room!.cleaningStatus).toBe('dirty');

      const checkOut = await prisma.checkOut.findUnique({ where: { reservationId: reservation.id } });
      expect(checkOut).not.toBeNull();
      expect(checkOut!.notes).toBe('תודה');

      const audit = await prisma.auditLog.findFirst({
        where: { entityId: reservation.id, action: 'CHECK_OUT' },
      });
      expect(audit).not.toBeNull();

      // cleanup
      await prisma.invoiceLineItem.deleteMany({ where: { invoiceId: invoice.id } });
      await prisma.invoice.delete({ where: { id: invoice.id } });
      await prisma.checkOut.delete({ where: { reservationId: reservation.id } });
      await prisma.reservation.delete({ where: { id: reservation.id } });
      await prisma.room.update({ where: { id: roomId }, data: { status: 'available', cleaningStatus: 'clean' } });
    });

    it('fails if not checked_in', async () => {
      const agent = await loginAs(MANAGER_EMAIL);

      const reservation = await prisma.reservation.create({
        data: {
          branchId, roomId, guestId,
          checkInDate: new Date(today()),
          checkOutDate: new Date(tomorrow()),
          status: 'confirmed',
          totalPrice: 500,
          createdBy: managerId,
          version: 0,
        },
      });

      const res = await agent
        .post(`/api/v1/reservations/${reservation.id}/check-out`)
        .send({});

      expect(res.status).toBe(400);
      await prisma.reservation.delete({ where: { id: reservation.id } });
    });
  });

  describe('GET /api/v1/front-desk/active-guests', () => {
    it('returns only checked_in reservations for branch', async () => {
      const agent = await loginAs(MANAGER_EMAIL);

      const reservationA = await prisma.reservation.create({
        data: {
          branchId, roomId, guestId,
          checkInDate: new Date(today()),
          checkOutDate: new Date(tomorrow()),
          status: 'checked_in',
          totalPrice: 500,
          createdBy: managerId,
          version: 0,
        },
      });

      const reservationB = await prisma.reservation.create({
        data: {
          branchId, roomId, guestId,
          checkInDate: new Date(tomorrow()),
          checkOutDate: new Date(dayAfter()),
          status: 'confirmed',
          totalPrice: 500,
          createdBy: managerId,
          version: 1,
        },
      });

      const res = await agent.get('/api/v1/front-desk/active-guests');

      expect(res.status).toBe(200);
      const body = res.body as ApiResponse<Array<{ id: string; status: string }>>;
      const ids = body.data!.map((r) => r.id);
      expect(ids).toContain(reservationA.id);
      expect(ids).not.toContain(reservationB.id);
      body.data!.forEach((r) => expect(r.status).toBe('checked_in'));

      await prisma.reservation.deleteMany({ where: { id: { in: [reservationA.id, reservationB.id] } } });
    });
  });

  describe('GET /api/v1/front-desk/arrivals', () => {
    it('returns confirmed reservations with checkInDate = today', async () => {
      const agent = await loginAs(MANAGER_EMAIL);

      const reservation = await prisma.reservation.create({
        data: {
          branchId, roomId, guestId,
          checkInDate: new Date(today()),
          checkOutDate: new Date(tomorrow()),
          status: 'confirmed',
          totalPrice: 500,
          createdBy: managerId,
          version: 0,
        },
      });

      const res = await agent.get(`/api/v1/front-desk/arrivals?date=${today()}`);

      expect(res.status).toBe(200);
      const body = res.body as ApiResponse<Array<{ id: string }>>;
      const ids = body.data!.map((r) => r.id);
      expect(ids).toContain(reservation.id);

      await prisma.reservation.delete({ where: { id: reservation.id } });
    });
  });

  describe('GET /api/v1/front-desk/departures', () => {
    it('returns checked_in reservations with checkOutDate = today', async () => {
      const agent = await loginAs(MANAGER_EMAIL);

      const reservation = await prisma.reservation.create({
        data: {
          branchId, roomId, guestId,
          checkInDate: new Date(today()),
          checkOutDate: new Date(today()),
          status: 'checked_in',
          totalPrice: 0,
          createdBy: managerId,
          version: 0,
        },
      });

      const res = await agent.get(`/api/v1/front-desk/departures?date=${today()}`);

      expect(res.status).toBe(200);
      const body = res.body as ApiResponse<Array<{ id: string }>>;
      const ids = body.data!.map((r) => r.id);
      expect(ids).toContain(reservation.id);

      await prisma.reservation.delete({ where: { id: reservation.id } });
    });
  });
});
