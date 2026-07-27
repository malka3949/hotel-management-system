import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';

export interface HealthStatus {
  status: 'ok' | 'degraded';
  db: 'up' | 'down';
  redis: 'up' | 'down' | 'not_configured';
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthStatus> {
    const [db, redis] = await Promise.all([
      this.checkDb(),
      this.checkRedis(),
    ]);

    const status = db === 'up' ? 'ok' : 'degraded';

    return { status, db, redis };
  }

  async isReady(): Promise<boolean> {
    const [db, redis] = await Promise.all([
      this.checkDb(),
      this.checkRedis(),
    ]);
    return db === 'up' && redis !== 'down';
  }

  private async checkDb(): Promise<'up' | 'down'> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async checkRedis(): Promise<'up' | 'down' | 'not_configured'> {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) return 'not_configured';

    const client = new Redis(redisUrl, { lazyConnect: true, connectTimeout: 3000 });
    try {
      await client.connect();
      await client.ping();
      return 'up';
    } catch {
      return 'down';
    } finally {
      client.disconnect();
    }
  }
}
