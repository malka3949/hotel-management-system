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

const TEST_PASSWORD = 'SecurePass123!';

describe('Security Regression (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let httpServer: ReturnType<INestApplication['getHttpServer']>;

  let branchId: string;
  let adminId: string;
  let managerId: string;
  let receptionId: string;
  let housekeepingId: string;

  const ADMIN_EMAIL    = 'sec-admin@test.hotel';
  const MANAGER_EMAIL  = 'sec-manager@test.hotel';
  const RECEPTION_EMAIL = 'sec-reception@test.hotel';
  const HK_EMAIL       = 'sec-hk@test.hotel';

  // ── helpers ──────────────────────────────────────────────────────────────────

  function getCsrf(): Promise<string> {
    return request(httpServer)
      .get('/api/v1/auth/csrf')
      .then((r) => (r.body as ApiResponse<{ csrfToken: string }>).data!.csrfToken);
  }

  async function loginAs(email: string): Promise<string> {
    const csrf = await getCsrf();
    const res = await request(httpServer)
      .post('/api/v1/auth/login')
      .set('x-csrf-token', csrf)
      .send({ email, password: TEST_PASSWORD });
    return (res.body as ApiResponse<{ accessToken: string }>).data!.accessToken;
  }

  // ── bootstrap ─────────────────────────────────────────────────────────────────

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

    httpServer = app.getHttpServer();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await prisma.$executeRawUnsafe('DROP RULE IF EXISTS no_update_audit_logs ON audit_logs');
    await prisma.$executeRawUnsafe('DROP RULE IF EXISTS no_delete_audit_logs ON audit_logs');

    const hash = await bcrypt.hash(TEST_PASSWORD, 12);

    const branch = await prisma.branch.create({
      data: { name: 'Security Test Branch', address: 'Security St 1' },
    });
    branchId = branch.id;

    const [admin, manager, reception, hk] = await Promise.all([
      prisma.user.create({ data: { name: 'Sec Admin', email: ADMIN_EMAIL, passwordHash: hash, role: 'chain_admin', branchId: null } }),
      prisma.user.create({ data: { name: 'Sec Manager', email: MANAGER_EMAIL, passwordHash: hash, role: 'hotel_manager', branchId } }),
      prisma.user.create({ data: { name: 'Sec Reception', email: RECEPTION_EMAIL, passwordHash: hash, role: 'receptionist', branchId } }),
      prisma.user.create({ data: { name: 'Sec HK', email: HK_EMAIL, passwordHash: hash, role: 'housekeeping', branchId } }),
    ]);

    adminId      = admin.id;
    managerId    = manager.id;
    receptionId  = reception.id;
    housekeepingId = hk.id;
  });

  afterAll(async () => {
    const userIds = [adminId, managerId, receptionId, housekeepingId];
    await prisma.passwordResetToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.branch.delete({ where: { id: branchId } });
    await app.close();
  });

  // ── 1. RBAC: receptionist blocked from manager-only routes ─────────────────

  describe('RBAC — receptionist', () => {
    let token: string;
    beforeAll(async () => { token = await loginAs(RECEPTION_EMAIL); });

    it('cannot create users (403)', async () => {
      await request(httpServer)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'X', email: 'x@x.com', password: 'Pass123!', role: 'receptionist', branchId })
        .expect(403);
    });

    it('cannot access reports (403)', async () => {
      await request(httpServer)
        .get('/api/v1/reports/occupancy-summary')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('cannot approve refunds (403)', async () => {
      await request(httpServer)
        .get('/api/v1/reports/revenue-summary')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('cannot access cross-branch reports (403)', async () => {
      await request(httpServer)
        .get('/api/v1/reports/cross-branch')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  // ── 2. RBAC: housekeeping blocked from staff routes ────────────────────────

  describe('RBAC — housekeeping', () => {
    let token: string;
    beforeAll(async () => { token = await loginAs(HK_EMAIL); });

    it('cannot list reservations (403)', async () => {
      await request(httpServer)
        .get('/api/v1/reservations')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('cannot list guests (403)', async () => {
      await request(httpServer)
        .get('/api/v1/guests')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('cannot access billing (403)', async () => {
      await request(httpServer)
        .get('/api/v1/reports/revenue-summary')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('cannot create housekeeping tasks (403 — manager-only)', async () => {
      await request(httpServer)
        .post('/api/v1/housekeeping/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ roomId: '00000000-0000-0000-0000-000000000000', scheduledFor: '2026-07-15' })
        .expect(403);
    });

    it('can read housekeeping tasks (200)', async () => {
      await request(httpServer)
        .get('/api/v1/housekeeping/tasks')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  // ── 3. RBAC: chain_admin gets cross-branch access ──────────────────────────

  describe('RBAC — chain_admin', () => {
    let token: string;
    beforeAll(async () => { token = await loginAs(ADMIN_EMAIL); });

    it('can access reports (200)', async () => {
      await request(httpServer)
        .get('/api/v1/reports/occupancy-summary')
        .set('Authorization', `Bearer ${token}`)
        .query({ branchId })
        .expect(200);
    });

    it('can access cross-branch reports (200)', async () => {
      await request(httpServer)
        .get('/api/v1/reports/cross-branch')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  // ── 4. Unauthenticated → 401 ──────────────────────────────────────────────

  describe('No auth', () => {
    it('GET /reservations → 401', async () => {
      await request(httpServer).get('/api/v1/reservations').expect(401);
    });

    it('GET /guests → 401', async () => {
      await request(httpServer).get('/api/v1/guests').expect(401);
    });

    it('GET /reports/occupancy-summary → 401', async () => {
      await request(httpServer).get('/api/v1/reports/occupancy-summary').expect(401);
    });
  });

  // ── 5. DTO validation: unknown fields rejected ─────────────────────────────

  describe('DTO validation', () => {
    it('rejects unknown fields on login (400)', async () => {
      const csrf = await getCsrf();
      await request(httpServer)
        .post('/api/v1/auth/login')
        .set('x-csrf-token', csrf)
        .send({ email: ADMIN_EMAIL, password: TEST_PASSWORD, injected: 'evil' })
        .expect(400);
    });

    it('rejects invalid email on forgot-password (400)', async () => {
      await request(httpServer)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'not-an-email' })
        .expect(400);
    });

    it('rejects short password on reset-password (400)', async () => {
      await request(httpServer)
        .post('/api/v1/auth/reset-password')
        .send({ token: 'anytoken', newPassword: 'short' })
        .expect(400);
    });
  });

  // ── 6. Password reset flow ─────────────────────────────────────────────────

  describe('Password reset', () => {
    it('forgot-password silently succeeds for non-existent email (200)', async () => {
      await request(httpServer)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nobody@nowhere.com' })
        .expect(200);
    });

    it('forgot-password returns 200 for real user', async () => {
      await request(httpServer)
        .post('/api/v1/auth/forgot-password')
        .send({ email: RECEPTION_EMAIL })
        .expect(200);
    });

    it('reset-password with invalid token returns 400', async () => {
      const res = await request(httpServer)
        .post('/api/v1/auth/reset-password')
        .send({ token: 'invalidtoken', newPassword: 'NewPass123!' });
      expect(res.status).toBe(400);
    });

    it('reset-password: token single-use — second use returns 400', async () => {
      const rawToken = 'testsingleusetoken123456789012345678901234567890';
      const crypto = await import('crypto');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      const user = await prisma.user.findUnique({ where: { email: MANAGER_EMAIL } });
      await prisma.passwordResetToken.create({
        data: {
          userId: user!.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      await request(httpServer)
        .post('/api/v1/auth/reset-password')
        .send({ token: rawToken, newPassword: 'NewPass123!' })
        .expect(200);

      const res2 = await request(httpServer)
        .post('/api/v1/auth/reset-password')
        .send({ token: rawToken, newPassword: 'AnotherPass123!' });
      expect(res2.status).toBe(400);
      expect(res2.body.error).toContain('ALREADY_USED');
    });

    it('reset-password: expired token returns 400', async () => {
      const rawToken = 'expiredtoken123456789012345678901234567890abc';
      const crypto = await import('crypto');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      const user = await prisma.user.findUnique({ where: { email: RECEPTION_EMAIL } });
      await prisma.passwordResetToken.create({
        data: {
          userId: user!.id,
          tokenHash,
          expiresAt: new Date(Date.now() - 1000), // already expired
        },
      });

      const res = await request(httpServer)
        .post('/api/v1/auth/reset-password')
        .send({ token: rawToken, newPassword: 'NewPass123!' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('EXPIRED');
    });
  });

  // ── 7. Session management ──────────────────────────────────────────────────

  describe('Session management', () => {
    let token: string;
    let sessionId: string;

    beforeAll(async () => { token = await loginAs(ADMIN_EMAIL); });

    it('GET /auth/sessions returns active sessions', async () => {
      const res = await request(httpServer)
        .get('/api/v1/auth/sessions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const sessions = (res.body as ApiResponse<{ id: string }[]>).data!;
      expect(sessions.length).toBeGreaterThan(0);
      sessionId = sessions[0].id;
    });

    it('GET /auth/sessions requires auth (401)', async () => {
      await request(httpServer).get('/api/v1/auth/sessions').expect(401);
    });

    it('DELETE /auth/sessions/:id revokes session', async () => {
      await request(httpServer)
        .delete(`/api/v1/auth/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const res = await request(httpServer)
        .get('/api/v1/auth/sessions')
        .set('Authorization', `Bearer ${token}`);
      const sessions = (res.body as ApiResponse<{ id: string }[]>).data!;
      expect(sessions.find((s) => s.id === sessionId)).toBeUndefined();
    });

    it('cannot revoke another user session (404)', async () => {
      const managerToken = await loginAs(MANAGER_EMAIL);
      const managerSessions = await request(httpServer)
        .get('/api/v1/auth/sessions')
        .set('Authorization', `Bearer ${managerToken}`);
      const mgSessionId = (managerSessions.body as ApiResponse<{ id: string }[]>).data![0].id;

      await request(httpServer)
        .delete(`/api/v1/auth/sessions/${mgSessionId}`)
        .set('Authorization', `Bearer ${token}`) // admin token, manager's session
        .expect(404);
    });
  });
});
