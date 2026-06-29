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
import { FAIL_TEST_TOKEN } from '../src/modules/billing/providers/manual.provider';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

describe('Billing (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let branchId: string;
  let branchBId: string;
  let managerId: string;
  let receptionistId: string;
  let roomId: string;
  let guestId: string;

  const MANAGER_EMAIL = 'billing-manager@test.hotel';
  const MANAGER_B_EMAIL = 'billing-manager-b@test.hotel';
  const RECEPTIONIST_EMAIL = 'billing-receptionist@test.hotel';
  const TEST_PASSWORD = 'TestPass123!';

  let managerToken: string;
  let managerBToken: string;
  let receptionistToken: string;

  let invoiceId: string;
  let reservationId: string;
  let paymentId: string;

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

    const branch = await prisma.branch.create({ data: { name: 'Billing Branch', address: 'Pay St 1' } });
    const branchB = await prisma.branch.create({ data: { name: 'Billing Branch B', address: 'Pay St 2' } });
    branchId = branch.id;
    branchBId = branchB.id;

    const manager = await prisma.user.create({
      data: { name: 'Billing Manager', email: MANAGER_EMAIL, passwordHash: hash, role: 'hotel_manager', branchId },
    });
    managerId = manager.id;
    void managerId;

    await prisma.user.create({
      data: { name: 'Billing Manager B', email: MANAGER_B_EMAIL, passwordHash: hash, role: 'hotel_manager', branchId: branchBId },
    });

    const receptionist = await prisma.user.create({
      data: { name: 'Billing Receptionist', email: RECEPTIONIST_EMAIL, passwordHash: hash, role: 'receptionist', branchId },
    });
    receptionistId = receptionist.id;
    void receptionistId;

    const roomType = await prisma.roomType.create({
      data: { branchId, name: 'Deluxe', basePrice: 400, maxOccupancy: 2 },
    });

    const room = await prisma.room.create({
      data: { branchId, roomTypeId: roomType.id, number: 'B101', floor: 1 },
    });
    roomId = room.id;
    void roomId;

    const guest = await prisma.guest.create({
      data: {
        branchId,
        fullName: 'Billing Guest',
        email: 'billing-guest@hotel.test',
        phone: '0501234567',
        passportId: 'BG123456',
      },
    });
    guestId = guest.id;

    managerToken = await login(MANAGER_EMAIL, TEST_PASSWORD);
    managerBToken = await login(MANAGER_B_EMAIL, TEST_PASSWORD);
    receptionistToken = await login(RECEPTIONIST_EMAIL, TEST_PASSWORD);

    // Create a checked-out reservation with a finalized invoice
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(); dayAfter.setDate(dayAfter.getDate() + 2);

    const reservation = await prisma.reservation.create({
      data: {
        branchId,
        roomId: room.id,
        guestId,
        checkInDate: tomorrow,
        checkOutDate: dayAfter,
        status: 'checked_out',
        totalPrice: 400,
        createdBy: manager.id,
      },
    });
    reservationId = reservation.id;

    // Create finalized invoice (as check-out would)
    const invoice = await prisma.invoice.create({
      data: {
        reservationId,
        branchId,
        guestId,
        status: 'finalized',
        subtotal: 400,
        tax: 68,
        total: 468,
        issuedAt: new Date(),
        lineItems: {
          create: {
            description: 'לינה 1 לילות — חדר B101',
            quantity: 1,
            unitPrice: 400,
            total: 400,
            itemType: 'room_charge',
          },
        },
      },
    });
    invoiceId = invoice.id;
  });

  afterAll(async () => {
    // Cleanup in reverse dependency order
    await prisma.refund.deleteMany({ where: { branchId } });
    await prisma.paymentAttempt.deleteMany({
      where: { payment: { branchId } },
    });
    await prisma.payment.deleteMany({ where: { branchId } });
    await prisma.charge.deleteMany({ where: { branchId } });
    await prisma.invoiceLineItem.deleteMany({
      where: { invoice: { branchId } },
    });
    await prisma.invoice.deleteMany({ where: { branchId } });
    await prisma.reservation.deleteMany({ where: { branchId } });
    await prisma.room.deleteMany({ where: { branchId } });
    await prisma.roomType.deleteMany({ where: { branchId } });
    await prisma.guest.deleteMany({ where: { branchId } });
    await prisma.$executeRawUnsafe(
      `DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE branch_id = $1 OR branch_id = $2)`,
      branchId, branchBId,
    );
    await prisma.user.deleteMany({ where: { OR: [{ branchId }, { branchId: branchBId }] } });
    await prisma.branch.deleteMany({ where: { id: { in: [branchId, branchBId] } } });
    await app.close();
  });

  // ── 1. Successful payment (manual/cash) ──────────────────────────────────────

  it('POST /api/v1/payments — cash payment succeeds, invoice.status = paid', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        invoiceId,
        paymentMethod: 'cash',
        provider: 'manual',
      })
      .expect(201);

    const body = res.body as ApiResponse<{ id: string; status: string }>;
    expect(body.success).toBe(true);
    expect(body.data?.status).toBe('succeeded');
    paymentId = body.data?.id ?? '';

    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    expect(invoice?.status).toBe('paid');
  });

  // ── 2. Already paid invoice ──────────────────────────────────────────────────

  it('POST /api/v1/payments — rejects payment on already-paid invoice', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        invoiceId,
        paymentMethod: 'cash',
        provider: 'manual',
      })
      .expect(400);
    expect((res.body as ApiResponse).message).toMatch(/INVOICE_ALREADY_PAID/);
  });

  // ── 3. Failed payment (FAIL_TEST_TOKEN) ──────────────────────────────────────

  it('POST /api/v1/payments — failed payment recorded in payment_attempts', async () => {
    // Create another finalized invoice for this test
    const reservation2 = await prisma.reservation.create({
      data: {
        branchId,
        roomId,
        guestId,
        checkInDate: new Date(Date.now() + 3 * 86400000),
        checkOutDate: new Date(Date.now() + 4 * 86400000),
        status: 'checked_out',
        totalPrice: 400,
        createdBy: managerId,
      },
    });
    const invoice2 = await prisma.invoice.create({
      data: {
        reservationId: reservation2.id,
        branchId,
        guestId,
        status: 'finalized',
        subtotal: 400,
        tax: 68,
        total: 468,
        issuedAt: new Date(),
      },
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        invoiceId: invoice2.id,
        paymentMethod: 'cash',
        provider: 'manual',
        token: FAIL_TEST_TOKEN,
      })
      .expect(201);

    const body = res.body as ApiResponse<{ id: string; status: string }>;
    expect(body.data?.status).toBe('failed');

    const attempts = await prisma.paymentAttempt.findMany({
      where: { paymentId: body.data?.id },
    });
    expect(attempts.length).toBeGreaterThan(0);
    expect(attempts[0].status).toBe('failed');

    const inv = await prisma.invoice.findUnique({ where: { id: invoice2.id } });
    expect(inv?.status).toBe('finalized');
  });

  // ── 4. Idempotency: same invoice cannot be double-charged after success ────────

  it('GET /api/v1/payments/:id — returns payment detail', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/payments/${paymentId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    const body = res.body as ApiResponse<{ id: string; attempts: unknown[] }>;
    expect(body.data?.id).toBe(paymentId);
    expect(Array.isArray(body.data?.attempts)).toBe(true);
  });

  // ── 5. Service charges ───────────────────────────────────────────────────────

  it('POST /api/v1/charges — adds charge to draft invoice, updates total', async () => {
    // Create a draft invoice for this test
    const res3 = await prisma.reservation.create({
      data: {
        branchId,
        roomId,
        guestId,
        checkInDate: new Date(Date.now() + 5 * 86400000),
        checkOutDate: new Date(Date.now() + 6 * 86400000),
        status: 'checked_in',
        totalPrice: 400,
        createdBy: managerId,
      },
    });
    const inv3 = await prisma.invoice.create({
      data: {
        reservationId: res3.id,
        branchId,
        guestId,
        status: 'draft',
        subtotal: 400,
        tax: 68,
        total: 468,
        issuedAt: null,
      },
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/charges')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        invoiceId: inv3.id,
        chargeType: 'minibar',
        description: 'מיניבר — שתיות וחטיפים',
        amount: 85,
      })
      .expect(201);

    const body = res.body as ApiResponse<{ invoice: { total: string } }>;
    expect(body.success).toBe(true);

    // total should be: (400 + 85) * 1.17 = 567.45
    const expectedTotal = ((400 + 85) * 1.17).toFixed(2);
    expect(Number(body.data?.invoice.total).toFixed(2)).toBe(expectedTotal);
  });

  // ── 6. Refund (manager) ──────────────────────────────────────────────────────

  it('POST /api/v1/refunds — manager refunds succeeded payment', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/refunds')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        paymentId,
        amount: 100,
        reason: 'שירות לקוי — זיכוי חלקי לפי בקשת האורח',
      })
      .expect(201);

    const body = res.body as ApiResponse<{ status: string; id: string }>;
    expect(body.success).toBe(true);
    expect(body.data?.status).toBe('succeeded');

    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    expect(payment?.status).toBe('refunded');
  });

  // ── 7. Refund by receptionist → 403 ─────────────────────────────────────────

  it('POST /api/v1/refunds — receptionist gets 403', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/refunds')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        paymentId,
        amount: 50,
        reason: 'לא אמור לעבוד — רצפשיוניסט אינו מורשה',
      })
      .expect(403);
  });

  // ── 8. Invoice PDF ───────────────────────────────────────────────────────────

  it('GET /api/v1/invoices/:id/pdf — returns PDF content-type', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/invoices/${invoiceId}/pdf`)
      .set('Authorization', `Bearer ${managerToken}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);

    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect((res.body as Buffer).length).toBeGreaterThan(100);
  });

  // ── 9. Reconciliation report ─────────────────────────────────────────────────

  it('GET /api/v1/reports/payment-reconciliation — returns totals', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/reports/payment-reconciliation?startDate=${weekAgo}&endDate=${today}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    const body = res.body as ApiResponse<{
      totalInvoiced: number;
      totalCollected: number;
      paymentCount: number;
    }>;
    expect(body.success).toBe(true);
    expect(typeof body.data?.totalInvoiced).toBe('number');
    expect(typeof body.data?.totalCollected).toBe('number');
  });

  // ── 10. Branch isolation ─────────────────────────────────────────────────────

  it('POST /api/v1/payments — manager from other branch gets 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${managerBToken}`)
      .send({
        invoiceId,
        paymentMethod: 'cash',
        provider: 'manual',
      })
      .expect(403);
    expect((res.body as ApiResponse).message).toMatch(/BRANCH_ACCESS_DENIED/);
  });

  // ── 11. Audit log entries ────────────────────────────────────────────────────

  it('audit logs have entries for payment and refund', async () => {
    const paymentLogs = await prisma.auditLog.findMany({
      where: { action: 'PAYMENT_SUCCEEDED', entityType: 'invoice' },
    });
    expect(paymentLogs.length).toBeGreaterThan(0);

    const refundLogs = await prisma.auditLog.findMany({
      where: { action: 'REFUND_PROCESSED', entityType: 'payment' },
    });
    expect(refundLogs.length).toBeGreaterThan(0);
  });
});
