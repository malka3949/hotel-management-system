import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  check(): { status: string; timestamp: string; version: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '0.0.1',
    };
  }
}
