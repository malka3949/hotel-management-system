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

describe('Housekeeping (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let branchId: string;
  let branchBId: string;
  let managerId: string;
  let housekeeperId: string;
  let housekeeper2Id: string;
  let roomId: string;
  let reservationId: string;

  const MANAGER_EMAIL = 'hk-manager@test.hotel';
  const HK_EMAIL = 'hk-staff@test.hotel';
  const HK2_EMAIL = 'hk-staff2@test.hotel';
  const TEST_PASSWORD = 'TestPass123!';

  let managerToken: string;
  let hkToken: string;
  let hk2Token: string;

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

    const branch = await prisma.branch.create({ data: { name: 'HK Branch', address: 'HK St 1' } });
    branchId = branch.id;

    const branchB = await prisma.branch.create({ data: { name: 'HK Branch B', address: 'HK St 2' } });
    branchBId = branchB.id;

    const manager = await prisma.user.create({
      data: { name: 'HK Manager', email: MANAGER_EMAIL, passwordHash: hash, role: 'hotel_manager', branchId },
    });
    managerId = manager.id;

    const housekeeper = await prisma.user.create({
      data: { name: 'HK Staff 1', email: HK_EMAIL, passwordHash: hash, role: 'housekeeping', branchId },
    });
    housekeeperId = housekeeper.id;

    const housekeeper2 = await prisma.user.create({
      data: { name: 'HK Staff 2', email: HK2_EMAIL, passwordHash: hash, role: 'housekeeping', branchId },
    });
    housekeeper2Id = housekeeper2.id;

    const roomType = await prisma.roomType.create({
      data: { branchId, name: 'Standard', basePrice: 300, maxOccupancy: 2 },
    });
    const room = await prisma.room.create({
      data: { branchId, roomTypeId: roomType.id, number: 'HK101', floor: 1 },
    });
    roomId = room.id;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const reservation = await prisma.reservation.create({
      data: {
        branchId,
        roomId,
        guestId: (
          await prisma.guest.create({
            data: { branchId, fullName: 'HK Guest', phone: '0501234567', passportId: 'HKG001' },
          })
        ).id,
        checkInDate: yesterday,
        checkOutDate: tomorrow,
        status: 'confirmed',
        totalPrice: 300,
        createdBy: managerId,
      },
    });
    reservationId = reservation.id;

    managerToken = await login(MANAGER_EMAIL);
    hkToken = await login(HK_EMAIL);
    hk2Token = await login(HK2_EMAIL);
  });

  afterAll(async () => {
    const reservationWhere = { reservation: { branchId } };
    await prisma.housekeepingTask.deleteMany({ where: { branchId } });
    await prisma.housekeepingTask.deleteMany({ where: { branchId: branchBId } });
    await prisma.auditLog.deleteMany({ where: { branchId } });
    await prisma.auditLog.deleteMany({ where: { branchId: branchBId } });
    await prisma.checkIn.deleteMany({ where: reservationWhere });
    await prisma.checkOut.deleteMany({ where: reservationWhere });
    await prisma.invoiceLineItem.deleteMany({ where: { invoice: reservationWhere } });
    await prisma.charge.deleteMany({ where: { invoice: reservationWhere } });
    await prisma.payment.deleteMany({ where: { reservation: { branchId } } });
    await prisma.invoice.deleteMany({ where: reservationWhere });
    await prisma.guestAccessToken.deleteMany({ where: reservationWhere });
    await prisma.onlineCheckIn.deleteMany({ where: reservationWhere });
    await prisma.reservation.deleteMany({ where: { branchId } });
    await prisma.guest.deleteMany({ where: { branchId } });
    await prisma.room.deleteMany({ where: { branchId } });
    await prisma.roomType.deleteMany({ where: { branchId } });
    await prisma.refreshToken.deleteMany({ where: { user: { branchId } } });
    await prisma.refreshToken.deleteMany({ where: { user: { branchId: branchBId } } });
    await prisma.user.deleteMany({ where: { branchId } });
    await prisma.user.deleteMany({ where: { branchId: branchBId } });
    await prisma.branch.deleteMany({ where: { id: { in: [branchId, branchBId] } } });
    await app.close();
  });

  // ── Test 1: check-out auto-creates housekeeping task ──────────────────────

  it('check-out creates urgent housekeeping task and sets room dirty', async () => {
    // First check-in the reservation
    const csrfRes = await request(app.getHttpServer()).get('/api/v1/auth/csrf').expect(200);
    const csrf = (csrfRes.body as ApiResponse<{ csrfToken: string }>).data?.csrfToken ?? '';

    await request(app.getHttpServer())
      .post(`/api/v1/reservations/${reservationId}/check-in`)
      .set('Authorization', `Bearer ${managerToken}`)
      .set('X-CSRF-Token', csrf)
      .send({})
      .expect(201);

    // Now check-out
    const csrfRes2 = await request(app.getHttpServer()).get('/api/v1/auth/csrf').expect(200);
    const csrf2 = (csrfRes2.body as ApiResponse<{ csrfToken: string }>).data?.csrfToken ?? '';

    await request(app.getHttpServer())
      .post(`/api/v1/reservations/${reservationId}/check-out`)
      .set('Authorization', `Bearer ${managerToken}`)
      .set('X-CSRF-Token', csrf2)
      .send({})
      .expect(201);

    // Verify task was created in DB
    const task = await prisma.housekeepingTask.findFirst({
      where: { reservationId, branchId },
    });

    expect(task).toBeTruthy();
    expect(task!.priority).toBe('urgent');
    expect(task!.status).toBe('pending');
    expect(task!.createdBy).toBeNull();

    // Verify room is dirty
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    expect(room!.cleaningStatus).toBe('dirty');
  });

  // ── Test 2: manager sees all branch tasks ────────────────────────────────

  it('GET /housekeeping/tasks — manager sees all branch tasks', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/housekeeping/tasks')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    const tasks = (res.body as ApiResponse<unknown[]>).data ?? [];
    expect(tasks.length).toBeGreaterThan(0);
  });

  // ── Test 3: housekeeper sees only own tasks ──────────────────────────────

  it('GET /housekeeping/tasks — housekeeper sees only own tasks', async () => {
    // Assign a task to housekeeper1
    const task = await prisma.housekeepingTask.findFirst({ where: { branchId } });
    await prisma.housekeepingTask.update({
      where: { id: task!.id },
      data: { assignedTo: housekeeperId },
    });

    // housekeeper1 query
    const res1 = await request(app.getHttpServer())
      .get('/api/v1/housekeeping/tasks')
      .set('Authorization', `Bearer ${hkToken}`)
      .expect(200);

    const tasks1 = (res1.body as ApiResponse<Array<{ assignedTo: string }>>).data ?? [];
    expect(tasks1.every((t) => t.assignedTo === housekeeperId)).toBe(true);

    // housekeeper2 sees only their own tasks — should be empty since none are assigned to them
    const res2 = await request(app.getHttpServer())
      .get('/api/v1/housekeeping/tasks')
      .set('Authorization', `Bearer ${hk2Token}`)
      .expect(200);

    const tasks2 = (res2.body as ApiResponse<Array<{ assignedTo: string }>>).data ?? [];
    expect(tasks2.length).toBe(0);
    expect(tasks2.every((t) => t.assignedTo === housekeeper2Id)).toBe(true);
  });

  // ── Test 4: branch isolation ─────────────────────────────────────────────

  it('manager from branch B cannot see branch A tasks', async () => {
    const hash = await bcrypt.hash(TEST_PASSWORD, 12);
    const managerB = await prisma.user.create({
      data: { name: 'B Manager', email: 'hk-b-mgr@test.hotel', passwordHash: hash, role: 'hotel_manager', branchId: branchBId },
    });

    const tokenB = await login('hk-b-mgr@test.hotel');

    const res = await request(app.getHttpServer())
      .get('/api/v1/housekeeping/tasks')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    const tasks = (res.body as ApiResponse<Array<{ branchId: string }>>).data ?? [];
    expect(tasks.every((t) => t.branchId === branchBId)).toBe(true);

    await prisma.refreshToken.deleteMany({ where: { userId: managerB.id } });
    await prisma.user.delete({ where: { id: managerB.id } });
  });

  // ── Test 5: manual task creation (manager) ───────────────────────────────

  it('POST /housekeeping/tasks — manager can create task manually', async () => {
    const payload = {
      roomId,
      scheduledFor: new Date().toISOString().split('T')[0],
      priority: 'normal',
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/housekeeping/tasks')
      .set('Authorization', `Bearer ${managerToken}`)
      .send(payload)
      .expect(201);

    const task = (res.body as ApiResponse<{ id: string; priority: string; createdBy: string }>).data!;
    expect(task.priority).toBe('normal');
    expect(task.createdBy).toBe(managerId);
  });

  // ── Test 6: assign — manager can assign; housekeeper cannot ──────────────

  it('PATCH /tasks/:id/assign — manager assigns; housekeeper gets 403', async () => {
    const task = await prisma.housekeepingTask.findFirst({ where: { branchId, status: 'pending' } });

    await request(app.getHttpServer())
      .patch(`/api/v1/housekeeping/tasks/${task!.id}/assign`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ assignedTo: housekeeperId })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/housekeeping/tasks/${task!.id}/assign`)
      .set('Authorization', `Bearer ${hkToken}`)
      .send({ assignedTo: housekeeper2Id })
      .expect(403);
  });

  // ── Test 7: start — sets room in_progress ───────────────────────────────

  it('PATCH /tasks/:id/start — sets task in_progress and room cleaning_status in_progress', async () => {
    const task = await prisma.housekeepingTask.findFirst({
      where: { branchId, status: 'pending', assignedTo: housekeeperId },
    });

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/housekeeping/tasks/${task!.id}/start`)
      .set('Authorization', `Bearer ${hkToken}`)
      .expect(200);

    const updated = (res.body as ApiResponse<{ status: string }>).data!;
    expect(updated.status).toBe('in_progress');

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    expect(room!.cleaningStatus).toBe('in_progress');
  });

  // ── Test 8: housekeeper cannot start another's task ──────────────────────

  it('housekeeper2 cannot start a task assigned to housekeeper1 — 403', async () => {
    const task = await prisma.housekeepingTask.findFirst({
      where: { branchId, assignedTo: housekeeperId },
    });

    // Reset to pending for this test
    await prisma.housekeepingTask.update({
      where: { id: task!.id },
      data: { status: 'pending', startedAt: null },
    });

    await request(app.getHttpServer())
      .patch(`/api/v1/housekeeping/tasks/${task!.id}/start`)
      .set('Authorization', `Bearer ${hk2Token}`)
      .expect(403);
  });

  // ── Test 9: complete — sets room clean ────────────────────────────────────

  it('PATCH /tasks/:id/complete — sets task completed and room cleaning_status clean', async () => {
    // Create and start a fresh task for this test
    const task = await prisma.housekeepingTask.create({
      data: {
        branchId,
        roomId,
        assignedTo: housekeeperId,
        priority: 'normal',
        scheduledFor: new Date(),
        status: 'in_progress',
        startedAt: new Date(),
        createdBy: managerId,
      },
    });

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/housekeeping/tasks/${task.id}/complete`)
      .set('Authorization', `Bearer ${hkToken}`)
      .expect(200);

    const updated = (res.body as ApiResponse<{ status: string; completedAt: string | null }>).data!;
    expect(updated.status).toBe('completed');
    expect(updated.completedAt).toBeTruthy();

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    expect(room!.cleaningStatus).toBe('clean');
    expect(room!.status).toBe('available');
  });

  // ── Test 10: skip — manager can skip; housekeeper cannot ─────────────────

  it('PATCH /tasks/:id/skip — manager skips; housekeeper gets 403', async () => {
    const task = await prisma.housekeepingTask.create({
      data: {
        branchId,
        roomId,
        priority: 'normal',
        scheduledFor: new Date(),
        createdBy: managerId,
      },
    });

    await request(app.getHttpServer())
      .patch(`/api/v1/housekeeping/tasks/${task.id}/skip`)
      .set('Authorization', `Bearer ${hkToken}`)
      .send({ reason: 'test' })
      .expect(403);

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/housekeeping/tasks/${task.id}/skip`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ reason: 'Room already clean' })
      .expect(200);

    const updated = (res.body as ApiResponse<{ status: string; notes: string }>).data!;
    expect(updated.status).toBe('skipped');
    expect(updated.notes).toBe('[דילוג] Room already clean');
  });
});
