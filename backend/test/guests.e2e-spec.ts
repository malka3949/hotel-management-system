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

describe('Guests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let branchAId: string;
  let branchBId: string;
  let adminUserId: string;
  let managerAUserId: string;
  let receptionUserId: string;
  let housekeepingUserId: string;

  const ADMIN_EMAIL = 'guests-admin@test.hotel';
  const MANAGER_EMAIL = 'guests-manager@test.hotel';
  const RECEPTION_EMAIL = 'guests-reception@test.hotel';
  const HOUSEKEEPING_EMAIL = 'guests-housekeeping@test.hotel';
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

    const branchA = await prisma.branch.create({ data: { name: 'Guests Branch A', address: 'St 1' } });
    const branchB = await prisma.branch.create({ data: { name: 'Guests Branch B', address: 'St 2' } });
    branchAId = branchA.id;
    branchBId = branchB.id;

    const admin = await prisma.user.create({
      data: { name: 'Guests Admin', email: ADMIN_EMAIL, passwordHash: hash, role: 'chain_admin', branchId: null },
    });
    const manager = await prisma.user.create({
      data: { name: 'Guests Manager', email: MANAGER_EMAIL, passwordHash: hash, role: 'hotel_manager', branchId: branchAId },
    });
    const reception = await prisma.user.create({
      data: { name: 'Guests Reception', email: RECEPTION_EMAIL, passwordHash: hash, role: 'receptionist', branchId: branchAId },
    });
    const housekeeping = await prisma.user.create({
      data: { name: 'Guests Housekeeping', email: HOUSEKEEPING_EMAIL, passwordHash: hash, role: 'housekeeping', branchId: branchAId },
    });

    adminUserId = admin.id;
    managerAUserId = manager.id;
    receptionUserId = reception.id;
    housekeepingUserId = housekeeping.id;
  });

  afterAll(async () => {
    const allUserIds = [adminUserId, managerAUserId, receptionUserId, housekeepingUserId];
    await prisma.guestDocument.deleteMany({ where: { branchId: { in: [branchAId, branchBId] } } });
    await prisma.guest.deleteMany({ where: { branchId: { in: [branchAId, branchBId] } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: allUserIds } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: allUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: allUserIds } } });
    await prisma.branch.deleteMany({ where: { id: { in: [branchAId, branchBId] } } });
    await app.close();
  });

  // ── helpers ──────────────────────────────────────────────────────────

  async function getCsrf(agent: request.Agent): Promise<string> {
    const res = await agent.get('/api/v1/auth/csrf');
    expect(res.status).toBe(200);
    return (res.body as ApiResponse<{ csrfToken: string }>).data!.csrfToken;
  }

  async function loginAs(email: string, password = TEST_PASSWORD) {
    const agent = request.agent(app.getHttpServer());
    const csrf = await getCsrf(agent);
    await agent.post('/api/v1/auth/login').set('X-CSRF-Token', csrf).send({ email, password });
    return agent;
  }

  function guestPayload(overrides: Record<string, unknown> = {}) {
    return {
      fullName: 'ישראל ישראלי',
      phone: '050-1234567',
      email: `guest-${Date.now()}@test.com`,
      nationality: 'IL',
      ...overrides,
    };
  }

  // ── Create ────────────────────────────────────────────────────────────

  describe('POST /api/v1/guests', () => {
    it('receptionist creates guest', async () => {
      const agent = await loginAs(RECEPTION_EMAIL);
      const res = await agent.post('/api/v1/guests').send(guestPayload({ fullName: 'שרה כהן', phone: '050-1111111' }));
      expect(res.status).toBe(201);
      const g = (res.body as ApiResponse<{ fullName: string; branchId: string }>).data!;
      expect(g.fullName).toBe('שרה כהן');
      expect(g.branchId).toBe(branchAId);
    });

    it('manager creates guest', async () => {
      const agent = await loginAs(MANAGER_EMAIL);
      const res = await agent.post('/api/v1/guests').send(guestPayload({ fullName: 'דוד לוי', phone: '050-2222222' }));
      expect(res.status).toBe(201);
    });

    it('housekeeping cannot create guest (403)', async () => {
      const agent = await loginAs(HOUSEKEEPING_EMAIL);
      const res = await agent.post('/api/v1/guests').send(guestPayload());
      expect(res.status).toBe(403);
    });

    it('unauthenticated gets 401', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/guests').send(guestPayload());
      expect(res.status).toBe(401);
    });
  });

  // ── Duplicate detection ───────────────────────────────────────────────

  describe('Duplicate detection', () => {
    it('duplicate email → 409 DUPLICATE_GUEST_EMAIL', async () => {
      const agent = await loginAs(RECEPTION_EMAIL);
      const sharedEmail = `dup-email-${Date.now()}@test.com`;
      await agent.post('/api/v1/guests').send(guestPayload({ phone: '050-3333333', email: sharedEmail }));
      const res2 = await agent.post('/api/v1/guests').send(guestPayload({ phone: '050-4444444', email: sharedEmail }));
      expect(res2.status).toBe(409);
      expect((res2.body as ApiResponse).error).toBe('Conflict');
    });

    it('duplicate passportId → 409 DUPLICATE_GUEST_PASSPORT', async () => {
      const agent = await loginAs(RECEPTION_EMAIL);
      const passportId = `PASS-${Date.now()}`;
      await agent.post('/api/v1/guests').send(guestPayload({ phone: '050-5555555', passportId, email: undefined }));
      const res2 = await agent.post('/api/v1/guests').send(guestPayload({ phone: '050-6666666', passportId, email: undefined }));
      expect(res2.status).toBe(409);
    });
  });

  // ── List ──────────────────────────────────────────────────────────────

  describe('GET /api/v1/guests', () => {
    it('returns only guests for own branch', async () => {
      const agent = await loginAs(MANAGER_EMAIL);
      const res = await agent.get('/api/v1/guests');
      expect(res.status).toBe(200);
      const body = (res.body as ApiResponse<{ items: Array<{ branchId: string }> }>).data!;
      body.items.forEach((g) => expect(g.branchId).toBe(branchAId));
    });

    it('returns paginated result with total', async () => {
      const agent = await loginAs(RECEPTION_EMAIL);
      const res = await agent.get('/api/v1/guests?limit=5&page=1');
      expect(res.status).toBe(200);
      const body = (res.body as ApiResponse<{ items: unknown[]; total: number; page: number }>).data!;
      expect(typeof body.total).toBe('number');
      expect(body.page).toBe(1);
    });

    it('chain_admin requires branchId param', async () => {
      const agent = await loginAs(ADMIN_EMAIL);
      const res = await agent.get('/api/v1/guests');
      expect(res.status).toBe(400);
    });

    it('chain_admin with branchId sees that branch', async () => {
      const agent = await loginAs(ADMIN_EMAIL);
      const res = await agent.get(`/api/v1/guests?branchId=${branchAId}`);
      expect(res.status).toBe(200);
      const body = (res.body as ApiResponse<{ items: Array<{ branchId: string }> }>).data!;
      body.items.forEach((g) => expect(g.branchId).toBe(branchAId));
    });
  });

  // ── Search ────────────────────────────────────────────────────────────

  describe('GET /api/v1/guests/search', () => {
    let searchGuestId: string;

    beforeAll(async () => {
      const agent = await loginAs(RECEPTION_EMAIL);
      const res = await agent.post('/api/v1/guests').send({
        fullName: 'מרים אברהם',
        phone: '050-9999999',
        email: 'miriam@search-test.com',
        passportId: 'SEARCH-PASS-001',
      });
      searchGuestId = (res.body as ApiResponse<{ id: string }>).data!.id;
    });

    afterAll(async () => {
      if (searchGuestId) {
        await prisma.guest.update({ where: { id: searchGuestId }, data: { isActive: false } });
      }
    });

    it('search by partial name', async () => {
      const agent = await loginAs(RECEPTION_EMAIL);
      const res = await agent.get('/api/v1/guests/search?q=מרים');
      expect(res.status).toBe(200);
      const results = (res.body as ApiResponse<Array<{ fullName: string }>>).data!;
      expect(results.some((r) => r.fullName.includes('מרים'))).toBe(true);
    });

    it('search by phone prefix', async () => {
      const agent = await loginAs(RECEPTION_EMAIL);
      const res = await agent.get('/api/v1/guests/search?q=050-9999');
      expect(res.status).toBe(200);
      const results = (res.body as ApiResponse<Array<{ phone: string }>>).data!;
      expect(results.some((r) => r.phone === '050-9999999')).toBe(true);
    });

    it('search by email', async () => {
      const agent = await loginAs(RECEPTION_EMAIL);
      const res = await agent.get('/api/v1/guests/search?q=miriam@search');
      expect(res.status).toBe(200);
      const results = (res.body as ApiResponse<Array<{ email: string | null }>>).data!;
      expect(results.some((r) => r.email === 'miriam@search-test.com')).toBe(true);
    });

    it('returns max 10 results', async () => {
      const agent = await loginAs(RECEPTION_EMAIL);
      const res = await agent.get('/api/v1/guests/search?q=א');
      expect(res.status).toBe(200);
      const results = (res.body as ApiResponse<unknown[]>).data!;
      expect(results.length).toBeLessThanOrEqual(10);
    });

    it('housekeeping cannot search (403)', async () => {
      const agent = await loginAs(HOUSEKEEPING_EMAIL);
      const res = await agent.get('/api/v1/guests/search?q=מרים');
      expect(res.status).toBe(403);
    });
  });

  // ── Get single ────────────────────────────────────────────────────────

  describe('GET /api/v1/guests/:id', () => {
    it('returns guest by id', async () => {
      const agent = await loginAs(RECEPTION_EMAIL);
      const created = await agent.post('/api/v1/guests').send(guestPayload({ fullName: 'בנימין ברק', phone: '050-7777777' }));
      const guestId = (created.body as ApiResponse<{ id: string }>).data!.id;

      const res = await agent.get(`/api/v1/guests/${guestId}`);
      expect(res.status).toBe(200);
      expect((res.body as ApiResponse<{ fullName: string }>).data!.fullName).toBe('בנימין ברק');
    });
  });

  // ── Update ────────────────────────────────────────────────────────────

  describe('PATCH /api/v1/guests/:id', () => {
    it('receptionist can update guest', async () => {
      const agent = await loginAs(RECEPTION_EMAIL);
      const created = await agent.post('/api/v1/guests').send(guestPayload({ phone: '050-8888881' }));
      const guestId = (created.body as ApiResponse<{ id: string }>).data!.id;

      const res = await agent.patch(`/api/v1/guests/${guestId}`).send({ fullName: 'שם מעודכן' });
      expect(res.status).toBe(200);
      expect((res.body as ApiResponse<{ fullName: string }>).data!.fullName).toBe('שם מעודכן');
    });

    it('housekeeping cannot update guest (403)', async () => {
      const managerAgent = await loginAs(MANAGER_EMAIL);
      const created = await managerAgent.post('/api/v1/guests').send(guestPayload({ phone: '050-8888882' }));
      const guestId = (created.body as ApiResponse<{ id: string }>).data!.id;

      const agent = await loginAs(HOUSEKEEPING_EMAIL);
      const res = await agent.patch(`/api/v1/guests/${guestId}`).send({ notes: 'test' });
      expect(res.status).toBe(403);
    });
  });

  // ── Soft delete ───────────────────────────────────────────────────────

  describe('DELETE /api/v1/guests/:id', () => {
    it('manager soft-deletes guest, does not appear in list', async () => {
      const agent = await loginAs(MANAGER_EMAIL);
      const created = await agent.post('/api/v1/guests').send(guestPayload({ phone: '050-0000001' }));
      const guestId = (created.body as ApiResponse<{ id: string }>).data!.id;

      const delRes = await agent.delete(`/api/v1/guests/${guestId}`);
      expect(delRes.status).toBe(200);

      const listRes = await agent.get('/api/v1/guests');
      const items = (listRes.body as ApiResponse<{ items: Array<{ id: string }> }>).data!.items;
      expect(items.find((g) => g.id === guestId)).toBeUndefined();
    });

    it('receptionist cannot delete (403)', async () => {
      const managerAgent = await loginAs(MANAGER_EMAIL);
      const created = await managerAgent.post('/api/v1/guests').send(guestPayload({ phone: '050-0000002' }));
      const guestId = (created.body as ApiResponse<{ id: string }>).data!.id;

      const agent = await loginAs(RECEPTION_EMAIL);
      const res = await agent.delete(`/api/v1/guests/${guestId}`);
      expect(res.status).toBe(403);
    });
  });

  // ── Branch isolation ──────────────────────────────────────────────────

  describe('Branch isolation', () => {
    it('manager from branch B cannot access guests from branch A', async () => {
      const managerAAgent = await loginAs(MANAGER_EMAIL);
      const created = await managerAAgent.post('/api/v1/guests').send(guestPayload({ phone: '050-0000003' }));
      const guestId = (created.body as ApiResponse<{ id: string }>).data!.id;

      const hash = await bcrypt.hash(TEST_PASSWORD, 12);
      const managerB = await prisma.user.create({
        data: { name: 'Manager B Guests', email: 'manager-b-guests@test.hotel', passwordHash: hash, role: 'hotel_manager', branchId: branchBId },
      });

      const agentB = await loginAs('manager-b-guests@test.hotel');
      const res = await agentB.get(`/api/v1/guests/${guestId}`);
      expect(res.status).toBe(403);

      await prisma.refreshToken.deleteMany({ where: { userId: managerB.id } });
      await prisma.user.delete({ where: { id: managerB.id } });
    });
  });

  // ── Documents ─────────────────────────────────────────────────────────

  describe('Guest Documents', () => {
    let docGuestId: string;

    beforeAll(async () => {
      const agent = await loginAs(RECEPTION_EMAIL);
      const res = await agent.post('/api/v1/guests').send(guestPayload({ phone: '050-0000010', fullName: 'אורח מסמכים' }));
      docGuestId = (res.body as ApiResponse<{ id: string }>).data!.id;
    });

    it('receptionist can add document', async () => {
      const agent = await loginAs(RECEPTION_EMAIL);
      const res = await agent.post(`/api/v1/guests/${docGuestId}/documents`).send({
        documentType: 'passport',
        documentNumber: 'A1234567',
        issuingCountry: 'IL',
        recordedAt: new Date().toISOString(),
      });
      expect(res.status).toBe(201);
      const doc = (res.body as ApiResponse<{ documentType: string; documentNumber: string }>).data!;
      expect(doc.documentType).toBe('passport');
      expect(doc.documentNumber).toBe('A1234567');
    });

    it('can list documents for guest', async () => {
      const agent = await loginAs(RECEPTION_EMAIL);
      const res = await agent.get(`/api/v1/guests/${docGuestId}/documents`);
      expect(res.status).toBe(200);
      const docs = (res.body as ApiResponse<unknown[]>).data!;
      expect(Array.isArray(docs)).toBe(true);
      expect(docs.length).toBeGreaterThanOrEqual(1);
    });

    it('housekeeping cannot add document (403)', async () => {
      const agent = await loginAs(HOUSEKEEPING_EMAIL);
      const res = await agent.post(`/api/v1/guests/${docGuestId}/documents`).send({
        documentType: 'id_card',
        documentNumber: '123456789',
        issuingCountry: 'IL',
        recordedAt: new Date().toISOString(),
      });
      expect(res.status).toBe(403);
    });
  });
});
