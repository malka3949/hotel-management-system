import * as crypto from 'crypto';
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

function tokenHash(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

describe('GuestPortal (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let branchId: string;
  let managerId: string;
  let guestId: string;
  let reservationId: string;
  let invoiceId: string;

  const MANAGER_EMAIL = 'portal-manager@test.hotel';
  const TEST_PASSWORD = 'TestPass123!';
  let managerToken: string;

  const login = async (email: string, password: string): Promise<string> => {
    const csrfRes = await request(app.getHttpServer())
      .get('/api/v1/auth/csrf')
      .expect(200);
    const csrfToken = (csrfRes.body as ApiResponse<{ csrfToken: string }>).data?.csrfToken ?? '';
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', csrfToken)
      .send({ email, password })
      .expect(200);
    return (res.body as ApiResponse<{ accessToken: string }>).data?.accessToken ?? '';
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
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

    const branch = await prisma.branch.create({ data: { name: 'Portal Branch', address: 'Portal St 1' } });
    branchId = branch.id;

    const manager = await prisma.user.create({
      data: { name: 'Portal Manager', email: MANAGER_EMAIL, passwordHash: hash, role: 'hotel_manager', branchId },
    });
    managerId = manager.id;

    const roomType = await prisma.roomType.create({
      data: { branchId, name: 'Standard', basePrice: 300, maxOccupancy: 2 },
    });
    const room = await prisma.room.create({
      data: { branchId, roomTypeId: roomType.id, number: 'P101', floor: 1 },
    });

    const guest = await prisma.guest.create({
      data: {
        branchId,
        fullName: 'Portal Guest',
        email: 'portal-guest@hotel.test',
        phone: '0501111111',
        passportId: 'PG999888',
      },
    });
    guestId = guest.id;

    // Reservation with check-in date in the past so check-in window is open
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const reservation = await prisma.reservation.create({
      data: {
        branchId,
        roomId: room.id,
        guestId,
        checkInDate: yesterday,
        checkOutDate: tomorrow,
        status: 'confirmed',
        totalPrice: 300,
        createdBy: managerId,
      },
    });
    reservationId = reservation.id;

    const invoice = await prisma.invoice.create({
      data: {
        reservationId,
        branchId,
        guestId,
        status: 'finalized',
        subtotal: 300,
        tax: 51,
        total: 351,
        issuedAt: new Date(),
        lineItems: {
          create: {
            description: 'לינה 2 לילות — חדר P101',
            quantity: 2,
            unitPrice: 150,
            total: 300,
            itemType: 'room_charge',
          },
        },
      },
    });
    invoiceId = invoice.id;
    void invoiceId;

    managerToken = await login(MANAGER_EMAIL, TEST_PASSWORD);
  });

  afterAll(async () => {
    await prisma.onlineCheckIn.deleteMany({ where: { guestId } });
    await prisma.paymentAttempt.deleteMany({ where: { payment: { branchId } } });
    await prisma.payment.deleteMany({ where: { branchId } });
    await prisma.guestAccessToken.deleteMany({ where: { guestId } });
    await prisma.invoice.deleteMany({ where: { reservationId } });
    await prisma.reservation.deleteMany({ where: { branchId } });
    await prisma.room.deleteMany({ where: { branchId } });
    await prisma.roomType.deleteMany({ where: { branchId } });
    await prisma.guest.deleteMany({ where: { branchId } });
    await prisma.auditLog.deleteMany({ where: { branchId } });
    await prisma.refreshToken.deleteMany({ where: { user: { branchId } } });
    await prisma.user.deleteMany({ where: { branchId } });
    await prisma.branch.delete({ where: { id: branchId } });
    await app.close();
  });

  // ── helpers ────────────────────────────────────────────────────────────────

  async function createToken(opts?: { expiresAt?: Date; usedAt?: Date | null }) {
    const raw = crypto.randomBytes(32).toString('hex');
    const expiresAt = opts?.expiresAt ?? new Date(Date.now() + 86400000 * 3);
    await prisma.guestAccessToken.create({
      data: {
        reservationId,
        guestId,
        tokenHash: tokenHash(raw),
        purpose: 'view',
        expiresAt,
        usedAt: opts?.usedAt ?? null,
      },
    });
    return raw;
  }

  // ── tests ──────────────────────────────────────────────────────────────────

  it('1. GET /portal/reservation/:token — valid token returns reservation', async () => {
    const token = await createToken();
    const res = await request(app.getHttpServer())
      .get(`/api/v1/portal/reservation/${token}`)
      .expect(200);
    const body = res.body as ApiResponse<{ id: string; guest: { fullName: string } }>;
    expect(body.success).toBe(true);
    expect(body.data?.id).toBe(reservationId);
    expect(body.data?.guest.fullName).toBe('Portal Guest');
  });

  it('2. GET /portal/reservation/:token — invalid token → 401', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/portal/reservation/deadbeef1234deadbeef1234deadbeef1234deadbeef1234deadbeef1234dead')
      .expect(401);
  });

  it('3. GET /portal/reservation/:token — expired token → 401', async () => {
    const expiredAt = new Date(Date.now() - 1000);
    const token = await createToken({ expiresAt: expiredAt });
    await request(app.getHttpServer())
      .get(`/api/v1/portal/reservation/${token}`)
      .expect(401);
  });

  it('4. POST /portal/reservation/:token/check-in — creates online check-in', async () => {
    const token = await createToken();
    const res = await request(app.getHttpServer())
      .post(`/api/v1/portal/reservation/${token}/check-in`)
      .send({
        fullName: 'Portal Guest Updated',
        passportId: 'PG999888',
        phone: '0502222222',
        estimatedArrivalTime: '15:00',
        specialRequests: 'קומה גבוהה',
      })
      .expect(200);
    expect((res.body as ApiResponse).success).toBe(true);

    const record = await prisma.onlineCheckIn.findUnique({ where: { reservationId } });
    expect(record).not.toBeNull();
    expect(record?.fullName).toBe('Portal Guest Updated');
    expect(record?.estimatedArrivalTime).toBe('15:00');
  });

  it('5. GET /portal/reservation/:token/invoice — returns invoice detail', async () => {
    const token = await createToken();
    const res = await request(app.getHttpServer())
      .get(`/api/v1/portal/reservation/${token}/invoice`)
      .expect(200);
    const body = res.body as ApiResponse<{ status: string; total: string }>;
    expect(body.success).toBe(true);
    expect(body.data?.status).toBe('finalized');
    expect(Number(body.data?.total)).toBeCloseTo(351, 0);
  });

  it('6. GET /portal/reservation/:token/invoice/pdf — returns PDF', async () => {
    const token = await createToken();
    const res = await request(app.getHttpServer())
      .get(`/api/v1/portal/reservation/${token}/invoice/pdf`)
      .expect(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
  });

  it('7. POST /portal/reservation/:token/payment — payment succeeds, invoice marked paid', async () => {
    const token = await createToken();
    const res = await request(app.getHttpServer())
      .post(`/api/v1/portal/reservation/${token}/payment`)
      .send({ paymentMethod: 'credit_card', provider: 'manual' })
      .expect(200);
    expect((res.body as ApiResponse).success).toBe(true);

    const invoice = await prisma.invoice.findUnique({ where: { reservationId } });
    expect(invoice?.status).toBe('paid');

    // token should be marked used
    const tokenRecord = await prisma.guestAccessToken.findFirst({
      where: { tokenHash: tokenHash(token) },
    });
    expect(tokenRecord?.usedAt).not.toBeNull();
  });

  it('8. POST /portal/reservation/:token/payment — already-used token → 403', async () => {
    const usedAt = new Date();
    const token = await createToken({ usedAt });
    await request(app.getHttpServer())
      .post(`/api/v1/portal/reservation/${token}/payment`)
      .send({ paymentMethod: 'credit_card', provider: 'manual' })
      .expect(403);
  });

  it('9. POST /portal/reservation/:token/payment — already-paid invoice → 400', async () => {
    const token = await createToken();
    await request(app.getHttpServer())
      .post(`/api/v1/portal/reservation/${token}/payment`)
      .send({ paymentMethod: 'credit_card', provider: 'manual' })
      .expect(400);
  });

  it('10. GET /portal/tokens/:reservationId — manager lists active tokens', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/portal/tokens/${reservationId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    const body = res.body as ApiResponse<Array<{ id: string }>>;
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('11. POST /portal/tokens/:reservationId/revoke — manager revokes tokens', async () => {
    await createToken();
    const res = await request(app.getHttpServer())
      .post(`/api/v1/portal/tokens/${reservationId}/revoke`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    const body = res.body as ApiResponse<{ count: number }>;
    expect(body.success).toBe(true);
    expect((body.data?.count ?? 0)).toBeGreaterThan(0);
  });

  it('12. audit logs have entries for online check-in and portal payment', async () => {
    const checkInLog = await prisma.auditLog.findFirst({
      where: { action: 'ONLINE_CHECK_IN_SUBMITTED', entityId: reservationId },
    });
    expect(checkInLog).not.toBeNull();

    const paymentLog = await prisma.auditLog.findFirst({
      where: { action: 'PORTAL_PAYMENT_SUCCEEDED', branchId },
    });
    expect(paymentLog).not.toBeNull();
  });
});
