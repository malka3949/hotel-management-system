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

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  branchId: string | null;
}

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let branchAId: string;
  let branchBId: string;
  let adminUserId: string;
  let managerUserId: string;
  let receptionUserId: string;

  const ADMIN_EMAIL = 'e2e-admin@test.hotel';
  const MANAGER_EMAIL = 'e2e-manager@test.hotel';
  const RECEPTION_EMAIL = 'e2e-reception@test.hotel';
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

    // Drop immutability rules so test teardown can clean up
    await prisma.$executeRawUnsafe(
      'DROP RULE IF EXISTS no_update_audit_logs ON audit_logs',
    );
    await prisma.$executeRawUnsafe(
      'DROP RULE IF EXISTS no_delete_audit_logs ON audit_logs',
    );

    const hash = await bcrypt.hash(TEST_PASSWORD, 12);

    const branchA = await prisma.branch.create({
      data: { name: 'E2E Branch A', address: 'Test St 1' },
    });
    const branchB = await prisma.branch.create({
      data: { name: 'E2E Branch B', address: 'Test St 2' },
    });
    branchAId = branchA.id;
    branchBId = branchB.id;

    const admin = await prisma.user.create({
      data: {
        name: 'E2E Admin',
        email: ADMIN_EMAIL,
        passwordHash: hash,
        role: 'chain_admin',
        branchId: null,
      },
    });
    const manager = await prisma.user.create({
      data: {
        name: 'E2E Manager',
        email: MANAGER_EMAIL,
        passwordHash: hash,
        role: 'hotel_manager',
        branchId: branchAId,
      },
    });
    const reception = await prisma.user.create({
      data: {
        name: 'E2E Reception',
        email: RECEPTION_EMAIL,
        passwordHash: hash,
        role: 'receptionist',
        branchId: branchAId,
      },
    });

    adminUserId = admin.id;
    managerUserId = manager.id;
    receptionUserId = reception.id;
  });

  afterEach(async () => {
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: [adminUserId, managerUserId, receptionUserId] } },
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({
      where: { userId: { in: [adminUserId, managerUserId, receptionUserId] } },
    });
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: [adminUserId, managerUserId, receptionUserId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [adminUserId, managerUserId, receptionUserId] } },
    });
    await prisma.branch.deleteMany({
      where: { id: { in: [branchAId, branchBId] } },
    });
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
    const res = await agent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', csrf)
      .send({ email, password });
    return { agent, res };
  }

  // ── CSRF ─────────────────────────────────────────────────────────────

  describe('GET /api/v1/auth/csrf', () => {
    it('returns 200 and sets csrf_token cookie', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/auth/csrf');
      expect(res.status).toBe(200);
      const body = res.body as ApiResponse<{ csrfToken: string }>;
      expect(body.success).toBe(true);
      expect(typeof body.data!.csrfToken).toBe('string');
      expect(body.data!.csrfToken).toHaveLength(64);
      const cookies = (res.headers['set-cookie'] ?? []) as unknown as string[];
      expect(cookies.some((c: string) => c.startsWith('csrf_token='))).toBe(true);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('rejects request without CSRF token → 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: ADMIN_EMAIL, password: TEST_PASSWORD });
      expect(res.status).toBe(403);
    });

    it('valid credentials → 200, sets HttpOnly cookies', async () => {
      const { res } = await loginAs(ADMIN_EMAIL);
      expect(res.status).toBe(200);
      const body = res.body as ApiResponse<{ user: UserData }>;
      expect(body.success).toBe(true);
      expect(body.data!.user.email).toBe(ADMIN_EMAIL);
      expect(body.data!.user.role).toBe('chain_admin');

      const cookies = (res.headers['set-cookie'] ?? []) as unknown as string[];
      expect(cookies.some((c: string) => c.includes('HttpOnly'))).toBe(true);
      expect(cookies.some((c: string) => c.startsWith('access_token='))).toBe(true);
      expect(cookies.some((c: string) => c.startsWith('refresh_token='))).toBe(true);
    });

    it('wrong password → 401', async () => {
      const agent = request.agent(app.getHttpServer());
      const csrf = await getCsrf(agent);
      const res = await agent
        .post('/api/v1/auth/login')
        .set('X-CSRF-Token', csrf)
        .send({ email: ADMIN_EMAIL, password: 'WrongPass999!' });
      expect(res.status).toBe(401);
    });

    it('unknown email → 401', async () => {
      const agent = request.agent(app.getHttpServer());
      const csrf = await getCsrf(agent);
      const res = await agent
        .post('/api/v1/auth/login')
        .set('X-CSRF-Token', csrf)
        .send({ email: 'nobody@test.hotel', password: TEST_PASSWORD });
      expect(res.status).toBe(401);
    });

    it('inactive user → 401', async () => {
      await prisma.user.update({
        where: { id: receptionUserId },
        data: { isActive: false },
      });
      const agent = request.agent(app.getHttpServer());
      const csrf = await getCsrf(agent);
      const res = await agent
        .post('/api/v1/auth/login')
        .set('X-CSRF-Token', csrf)
        .send({ email: RECEPTION_EMAIL, password: TEST_PASSWORD });
      expect(res.status).toBe(401);
      await prisma.user.update({
        where: { id: receptionUserId },
        data: { isActive: true },
      });
    });

    it('writes audit log entry on successful login', async () => {
      await loginAs(MANAGER_EMAIL);
      const log = await prisma.auditLog.findFirst({
        where: { userId: managerUserId, action: 'LOGIN' },
        orderBy: { createdAt: 'desc' },
      });
      expect(log).not.toBeNull();
    });

    it('writes audit log entry on failed login', async () => {
      const agent = request.agent(app.getHttpServer());
      const csrf = await getCsrf(agent);
      await agent
        .post('/api/v1/auth/login')
        .set('X-CSRF-Token', csrf)
        .send({ email: ADMIN_EMAIL, password: 'WrongPass999!' });
      const log = await prisma.auditLog.findFirst({
        where: { userId: adminUserId, action: 'FAILED_LOGIN' },
        orderBy: { createdAt: 'desc' },
      });
      expect(log).not.toBeNull();
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('valid refresh token → 200, new cookies issued', async () => {
      const { agent } = await loginAs(ADMIN_EMAIL);
      const csrf = await getCsrf(agent);
      const res = await agent
        .post('/api/v1/auth/refresh')
        .set('X-CSRF-Token', csrf);
      expect(res.status).toBe(200);
      const cookies = (res.headers['set-cookie'] ?? []) as unknown as string[];
      expect(cookies.some((c: string) => c.startsWith('access_token='))).toBe(true);
    });

    it('no refresh token cookie → 401', async () => {
      const agent = request.agent(app.getHttpServer());
      const csrf = await getCsrf(agent);
      const res = await agent
        .post('/api/v1/auth/refresh')
        .set('X-CSRF-Token', csrf);
      expect(res.status).toBe(401);
    });

    it('revoked refresh token → 401', async () => {
      const { agent } = await loginAs(ADMIN_EMAIL);
      // First refresh rotates the token
      const csrf1 = await getCsrf(agent);
      await agent.post('/api/v1/auth/refresh').set('X-CSRF-Token', csrf1);

      // Force-revoke all tokens for this user to simulate replay
      await prisma.refreshToken.updateMany({
        where: { userId: adminUserId },
        data: { revokedAt: new Date() },
      });

      const csrf2 = await getCsrf(agent);
      const res = await agent
        .post('/api/v1/auth/refresh')
        .set('X-CSRF-Token', csrf2);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('logout revokes refresh token and clears cookies', async () => {
      const { agent } = await loginAs(ADMIN_EMAIL);
      const csrf = await getCsrf(agent);
      const res = await agent
        .post('/api/v1/auth/logout')
        .set('X-CSRF-Token', csrf);
      expect(res.status).toBe(200);

      // Subsequent refresh should fail
      const csrf2 = await getCsrf(agent);
      const refreshRes = await agent
        .post('/api/v1/auth/refresh')
        .set('X-CSRF-Token', csrf2);
      expect(refreshRes.status).toBe(401);
    });

    it('writes LOGOUT audit log entry', async () => {
      const { agent } = await loginAs(ADMIN_EMAIL);
      const csrf = await getCsrf(agent);
      await agent.post('/api/v1/auth/logout').set('X-CSRF-Token', csrf);
      const log = await prisma.auditLog.findFirst({
        where: { userId: adminUserId, action: 'LOGOUT' },
        orderBy: { createdAt: 'desc' },
      });
      expect(log).not.toBeNull();
    });
  });

  describe('JwtAuthGuard', () => {
    it('no token → 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/users/me');
      expect(res.status).toBe(401);
    });

    it('valid JWT → protected route accessible', async () => {
      const { agent } = await loginAs(ADMIN_EMAIL);
      const res = await agent.get('/api/v1/users/me');
      expect(res.status).toBe(200);
      const body = res.body as ApiResponse<UserData>;
      expect(body.data!.email).toBe(ADMIN_EMAIL);
    });
  });

  describe('RolesGuard', () => {
    it('receptionist cannot create users → 403', async () => {
      const { agent } = await loginAs(RECEPTION_EMAIL);
      const csrf = await getCsrf(agent);

      // POST /api/v1/users requires chain_admin or hotel_manager
      // receptionist should get 403
      const res = await agent
        .post('/api/v1/users')
        .set('X-CSRF-Token', csrf) // CSRF not on users endpoint but set anyway
        .send({
          name: 'Test',
          email: 'test@test.hotel',
          password: 'TestPass123!',
          role: 'receptionist',
        });
      expect(res.status).toBe(403);
    });
  });

  describe('Branch isolation', () => {
    it('chain_admin sees all branches', async () => {
      const { agent } = await loginAs(ADMIN_EMAIL);
      const res = await agent.get('/api/v1/branches');
      expect(res.status).toBe(200);
      const body = res.body as ApiResponse<unknown[]>;
      expect(body.data!.length).toBeGreaterThanOrEqual(2);
    });

    it('hotel_manager sees only own branch', async () => {
      const { agent } = await loginAs(MANAGER_EMAIL);
      const res = await agent.get('/api/v1/branches');
      expect(res.status).toBe(200);
      const body = res.body as ApiResponse<{ id: string }[]>;
      expect(body.data!.every((b) => b.id === branchAId)).toBe(true);
    });

    it('manager cannot update branch from different branch → 403', async () => {
      const { agent } = await loginAs(MANAGER_EMAIL);
      // branchBId belongs to Branch B; manager is on Branch A
      const res = await agent
        .patch(`/api/v1/branches/${branchBId}`)
        .send({ name: 'Hacked Branch' });
      expect(res.status).toBe(403);
    });
  });
});
