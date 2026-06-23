import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { JwtPayload } from '../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class BranchGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user: JwtPayload;
      params: Record<string, string>;
      query: Record<string, string>;
    }>();
    const user = request.user;

    // chain_admin can access all branches
    if (user.role === 'chain_admin') return true;

    const requestedBranchId =
      request.params['branchId'] ?? request.query['branchId'];

    if (requestedBranchId && requestedBranchId !== user.branchId) {
      throw new ForbiddenException('BRANCH_ACCESS_DENIED');
    }

    return true;
  }
}
