import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { HealthService, HealthStatus } from './health.service';

@Controller()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get('health')
  async check(): Promise<HealthStatus> {
    return this.health.check();
  }

  @Get('ready')
  async ready(): Promise<{ ready: boolean }> {
    const isReady = await this.health.isReady();
    if (!isReady) {
      throw new HttpException('Service not ready', HttpStatus.SERVICE_UNAVAILABLE);
    }
    return { ready: true };
  }
}
