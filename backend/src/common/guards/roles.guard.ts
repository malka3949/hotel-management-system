import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload } from '../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) throw new ForbiddenException('ROLES_NOT_CONFIGURED');

    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const user = request.user;

    if (!required.includes(user.role)) {
      throw new ForbiddenException('INSUFFICIENT_ROLE');
    }

    return true;
  }
}
