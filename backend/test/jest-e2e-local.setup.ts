import { execSync } from 'child_process';
import * as path from 'path';

export default async function globalSetup(): Promise<void> {
  process.env['DATABASE_URL'] = 'postgresql://hotel_user:hotel_pass@localhost:5432/hotel_management_test';
  process.env['JWT_SECRET'] = 'test-jwt-secret-min-32-chars-long-enough';
  process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret-min-32-chars-enough';
  process.env['CSRF_SECRET'] = 'test-csrf-secret-min-32-chars-enough!!';
  process.env['REFRESH_TOKEN_HMAC_KEY'] = 'test-hmac-key-min-32-chars-enough!!!!!';
  process.env['STRIPE_SECRET_KEY'] = '';
  process.env['STRIPE_WEBHOOK_SECRET'] = '';

  execSync('npx prisma migrate deploy', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env },
  });
}
