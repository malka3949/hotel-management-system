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

describe('Rooms (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let branchAId: string;
  let branchBId: string;
  let adminUserId: string;
  let managerAUserId: string;
  let receptionUserId: string;

  const ADMIN_EMAIL = 'rooms-admin@test.hotel';
  const MANAGER_EMAIL = 'rooms-manager@test.hotel';
  const RECEPTION_EMAIL = 'rooms-reception@test.hotel';
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

    const branchA = await prisma.branch.create({ data: { name: 'Rooms Branch A', address: 'St 1' } });
    const branchB = await prisma.branch.create({ data: { name: 'Rooms Branch B', address: 'St 2' } });
    branchAId = branchA.id;
    branchBId = branchB.id;

    const admin = await prisma.user.create({
      data: { name: 'Rooms Admin', email: ADMIN_EMAIL, passwordHash: hash, role: 'chain_admin', branchId: null },
    });
    const manager = await prisma.user.create({
      data: { name: 'Rooms Manager', email: MANAGER_EMAIL, passwordHash: hash, role: 'hotel_manager', branchId: branchAId },
    });
    const reception = await prisma.user.create({
      data: { name: 'Rooms Reception', email: RECEPTION_EMAIL, passwordHash: hash, role: 'receptionist', branchId: branchAId },
    });

    adminUserId = admin.id;
    managerAUserId = manager.id;
    receptionUserId = reception.id;
  });

  afterAll(async () => {
    await prisma.room.deleteMany({ where: { branchId: { in: [branchAId, branchBId] } } });
    await prisma.roomType.deleteMany({ where: { branchId: { in: [branchAId, branchBId] } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: [adminUserId, managerAUserId, receptionUserId] } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: [adminUserId, managerAUserId, receptionUserId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [adminUserId, managerAUserId, receptionUserId] } } });
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

  async function createRoomType(
    agent: request.Agent,
    data: { name: string; basePrice: number; maxOccupancy: number },
  ) {
    const res = await agent.post('/api/v1/room-types').send(data);
    expect(res.status).toBe(201);
    return (res.body as ApiResponse<{ id: string }>).data!;
  }

  // ── Room Types ────────────────────────────────────────────────────────

  describe('POST /api/v1/room-types', () => {
    it('manager creates room type', async () => {
      const agent = await loginAs(MANAGER_EMAIL);
      const res = await agent
        .post('/api/v1/room-types')
        .send({ name: 'Standard', basePrice: 300, maxOccupancy: 2 });
      expect(res.status).toBe(201);
      const data = (res.body as ApiResponse<{ name: string; branchId: string }>).data!;
      expect(data.name).toBe('Standard');
      expect(data.branchId).toBe(branchAId);
    });

    it('receptionist cannot create room type (403)', async () => {
      const agent = await loginAs(RECEPTION_EMAIL);
      const res = await agent
        .post('/api/v1/room-types')
        .send({ name: 'Deluxe', basePrice: 500, maxOccupancy: 2 });
      expect(res.status).toBe(403);
    });

    it('unauthenticated gets 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/room-types')
        .send({ name: 'X', basePrice: 100, maxOccupancy: 1 });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/room-types', () => {
    it('returns room types for branch', async () => {
      const agent = await loginAs(MANAGER_EMAIL);
      await createRoomType(agent, { name: 'Suite', basePrice: 800, maxOccupancy: 4 });
      const res = await agent.get('/api/v1/room-types');
      expect(res.status).toBe(200);
      const types = (res.body as ApiResponse<unknown[]>).data!;
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Rooms ─────────────────────────────────────────────────────────────

  describe('POST /api/v1/rooms', () => {
    it('manager creates room', async () => {
      const agent = await loginAs(MANAGER_EMAIL);
      const rt = await createRoomType(agent, { name: 'Double', basePrice: 400, maxOccupancy: 2 });
      const res = await agent.post('/api/v1/rooms').send({
        roomTypeId: rt.id,
        number: '101',
        floor: 1,
      });
      expect(res.status).toBe(201);
      const room = (res.body as ApiResponse<{ number: string; status: string; cleaningStatus: string; branchId: string }>).data!;
      expect(room.number).toBe('101');
      expect(room.status).toBe('available');
      expect(room.cleaningStatus).toBe('clean');
      expect(room.branchId).toBe(branchAId);
    });

    it('duplicate number in same branch → 409', async () => {
      const agent = await loginAs(MANAGER_EMAIL);
      const types = await agent.get('/api/v1/room-types');
      const rtId = (types.body as ApiResponse<Array<{ id: string }>>).data![0].id;
      await agent.post('/api/v1/rooms').send({ roomTypeId: rtId, number: '201' });
      const res2 = await agent.post('/api/v1/rooms').send({ roomTypeId: rtId, number: '201' });
      expect(res2.status).toBe(409);
    });

    it('receptionist cannot create room (403)', async () => {
      const agent = await loginAs(RECEPTION_EMAIL);
      const managerAgent = await loginAs(MANAGER_EMAIL);
      const types = await managerAgent.get('/api/v1/room-types');
      const rtId = (types.body as ApiResponse<Array<{ id: string }>>).data![0].id;
      const res = await agent.post('/api/v1/rooms').send({ roomTypeId: rtId, number: '999' });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/rooms', () => {
    it('returns only rooms for own branch', async () => {
      const agent = await loginAs(MANAGER_EMAIL);
      const res = await agent.get('/api/v1/rooms');
      expect(res.status).toBe(200);
      const rooms = (res.body as ApiResponse<Array<{ branchId: string }>>).data!;
      rooms.forEach((r) => expect(r.branchId).toBe(branchAId));
    });

    it('filters by status', async () => {
      const agent = await loginAs(MANAGER_EMAIL);
      const res = await agent.get('/api/v1/rooms?status=available');
      expect(res.status).toBe(200);
      const rooms = (res.body as ApiResponse<Array<{ status: string }>>).data!;
      rooms.forEach((r) => expect(r.status).toBe('available'));
    });

    it('chain_admin can pass branchId query param', async () => {
      const agent = await loginAs(ADMIN_EMAIL);
      const res = await agent.get(`/api/v1/rooms?branchId=${branchAId}`);
      expect(res.status).toBe(200);
      const rooms = (res.body as ApiResponse<Array<{ branchId: string }>>).data!;
      rooms.forEach((r) => expect(r.branchId).toBe(branchAId));
    });
  });

  describe('PATCH /api/v1/rooms/:id/status', () => {
    it('receptionist can update status', async () => {
      const managerAgent = await loginAs(MANAGER_EMAIL);
      const types = await managerAgent.get('/api/v1/room-types');
      const rtId = (types.body as ApiResponse<Array<{ id: string }>>).data![0].id;
      const createRes = await managerAgent.post('/api/v1/rooms').send({ roomTypeId: rtId, number: '301' });
      const roomId = (createRes.body as ApiResponse<{ id: string }>).data!.id;

      const agent = await loginAs(RECEPTION_EMAIL);
      const res = await agent.patch(`/api/v1/rooms/${roomId}/status`).send({ status: 'occupied' });
      expect(res.status).toBe(200);
      expect((res.body as ApiResponse<{ status: string }>).data!.status).toBe('occupied');
    });
  });

  describe('PATCH /api/v1/rooms/:id/cleaning-status', () => {
    it('updates cleaning status', async () => {
      const managerAgent = await loginAs(MANAGER_EMAIL);
      const types = await managerAgent.get('/api/v1/room-types');
      const rtId = (types.body as ApiResponse<Array<{ id: string }>>).data![0].id;
      const createRes = await managerAgent.post('/api/v1/rooms').send({ roomTypeId: rtId, number: '401' });
      const roomId = (createRes.body as ApiResponse<{ id: string }>).data!.id;

      const res = await managerAgent.patch(`/api/v1/rooms/${roomId}/cleaning-status`).send({ cleaningStatus: 'dirty' });
      expect(res.status).toBe(200);
      expect((res.body as ApiResponse<{ cleaningStatus: string }>).data!.cleaningStatus).toBe('dirty');
    });
  });

  describe('DELETE /api/v1/rooms/:id (soft delete)', () => {
    it('manager soft-deletes room, room disappears from list', async () => {
      const agent = await loginAs(MANAGER_EMAIL);
      const types = await agent.get('/api/v1/room-types');
      const rtId = (types.body as ApiResponse<Array<{ id: string }>>).data![0].id;
      const createRes = await agent.post('/api/v1/rooms').send({ roomTypeId: rtId, number: '501' });
      const roomId = (createRes.body as ApiResponse<{ id: string }>).data!.id;

      const delRes = await agent.delete(`/api/v1/rooms/${roomId}`);
      expect(delRes.status).toBe(200);

      const listRes = await agent.get('/api/v1/rooms');
      const rooms = (listRes.body as ApiResponse<Array<{ id: string }>>).data!;
      expect(rooms.find((r) => r.id === roomId)).toBeUndefined();
    });

    it('receptionist cannot delete (403)', async () => {
      const managerAgent = await loginAs(MANAGER_EMAIL);
      const types = await managerAgent.get('/api/v1/room-types');
      const rtId = (types.body as ApiResponse<Array<{ id: string }>>).data![0].id;
      const createRes = await managerAgent.post('/api/v1/rooms').send({ roomTypeId: rtId, number: '502' });
      const roomId = (createRes.body as ApiResponse<{ id: string }>).data!.id;

      const agent = await loginAs(RECEPTION_EMAIL);
      const res = await agent.delete(`/api/v1/rooms/${roomId}`);
      expect(res.status).toBe(403);
    });
  });

  describe('Branch isolation', () => {
    it('manager from branch B cannot see branch A rooms via direct GET', async () => {
      const managerAAgent = await loginAs(MANAGER_EMAIL);
      const types = await managerAAgent.get('/api/v1/room-types');
      const rtId = (types.body as ApiResponse<Array<{ id: string }>>).data![0].id;
      const createRes = await managerAAgent.post('/api/v1/rooms').send({ roomTypeId: rtId, number: '601' });
      const roomId = (createRes.body as ApiResponse<{ id: string }>).data!.id;

      // Create manager for branch B
      const hash = await bcrypt.hash(TEST_PASSWORD, 12);
      const managerB = await prisma.user.create({
        data: { name: 'Manager B', email: 'manager-b-rooms@test.hotel', passwordHash: hash, role: 'hotel_manager', branchId: branchBId },
      });

      const agentB = await loginAs('manager-b-rooms@test.hotel');
      const res = await agentB.get(`/api/v1/rooms/${roomId}`);
      expect(res.status).toBe(403);

      await prisma.refreshToken.deleteMany({ where: { userId: managerB.id } });
      await prisma.user.delete({ where: { id: managerB.id } });
    });
  });
});
