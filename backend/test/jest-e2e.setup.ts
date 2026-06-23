import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export default async function globalSetup(): Promise<void> {
  const envTestPath = path.join(__dirname, '..', '.env.test');
  if (fs.existsSync(envTestPath)) {
    const lines = fs.readFileSync(envTestPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      process.env[key] = val;
    }
  }

  execSync('npx prisma migrate reset --force --skip-seed', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env },
  });
}
