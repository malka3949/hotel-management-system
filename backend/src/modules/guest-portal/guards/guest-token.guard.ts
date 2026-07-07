import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { GuestPortalService } from '../guest-portal.service';
import { Request } from 'express';
import { GuestTokenPayload } from '../interfaces/guest-token-payload.interface';

export interface GuestRequest extends Request {
  guestToken: GuestTokenPayload;
}

@Injectable()
export class GuestTokenGuard implements CanActivate {
  constructor(private readonly portalService: GuestPortalService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<GuestRequest>();
    const rawToken = req.params['token'] as string | undefined;

    if (!rawToken) {
      throw new UnauthorizedException('TOKEN_MISSING');
    }

    const payload = await this.portalService.validateToken(rawToken);
    if (!payload) {
      throw new UnauthorizedException('TOKEN_INVALID_OR_EXPIRED');
    }

    req.guestToken = payload;
    return true;
  }
}

@Injectable()
export class GuestPaymentTokenGuard implements CanActivate {
  constructor(private readonly portalService: GuestPortalService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<GuestRequest>();
    const rawToken = req.params['token'] as string | undefined;

    if (!rawToken) {
      throw new UnauthorizedException('TOKEN_MISSING');
    }

    const payload = await this.portalService.validateToken(rawToken);
    if (!payload) {
      throw new UnauthorizedException('TOKEN_INVALID_OR_EXPIRED');
    }

    if (payload.usedAt) {
      throw new ForbiddenException('TOKEN_ALREADY_USED');
    }

    req.guestToken = payload as GuestTokenPayload;
    return true;
  }
}
