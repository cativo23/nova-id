import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLE_KEY } from '../decorators/require-role.decorator';

/**
 * RoleGuard — Platform role authorization for demo-api.
 *
 * Copied from IdP api/src/guards/role.guard.ts — demo-api must not import
 * from api/ (ADR-0001). Reads the `role` claim set by DemoAuthenticatedGuard
 * from the Oathkeeper id_token.
 */
@Injectable()
export class RoleGuard implements CanActivate {
  private readonly logger = new Logger(RoleGuard.name);

  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRole = this.reflector.getAllAndOverride<string>(ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRole) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      throw new ForbiddenException('User ID not found in request context');
    }

    const userRole = user.role || 'platform_user';

    if (userRole !== requiredRole) {
      this.logger.warn(
        `Access denied for user ${user.userId}: required ${requiredRole}, has ${userRole}`,
      );
      throw new ForbiddenException(
        `Access denied. Required role: ${requiredRole}. Your role: ${userRole}`,
      );
    }

    return true;
  }
}
