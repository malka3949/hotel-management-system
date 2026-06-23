import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { createHmac } from 'crypto';
import { Request } from 'express';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const token = req.headers['x-csrf-token'] as string | undefined;

    if (!token) throw new ForbiddenException('CSRF_TOKEN_INVALID');

    const parts = token.split('.');
    if (parts.length !== 3) throw new ForbiddenException('CSRF_TOKEN_INVALID');

    const [nonce, expires, sig] = parts;
    const payload = `${nonce}.${expires}`;
    const secret = process.env.CSRF_SECRET;
    if (!secret) throw new ForbiddenException('CSRF_TOKEN_INVALID');
    const expected = createHmac('sha256', secret).update(payload).digest('hex');

    if (sig !== expected) throw new ForbiddenException('CSRF_TOKEN_INVALID');
    if (Date.now() > parseInt(expires, 10)) throw new ForbiddenException('CSRF_TOKEN_EXPIRED');

    return true;
  }
}
