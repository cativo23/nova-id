import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { KetoService } from '../ory/keto.service';

/**
 * PlatformAdministerGuard — Keto permission gate for Platform:nova#administer.
 *
 * Protects endpoints that administer the platform (e.g. OAuth2 client CRUD).
 * Requires the caller to hold the `administer` relation on the `Platform:nova`
 * object in Keto.
 *
 * Fail-closed: any Keto error (service down, network failure) results in deny
 * because KetoService.check() already returns false on error.
 *
 * Must be applied AFTER AuthenticatedGuard (which populates request.user).
 */
@Injectable()
export class PlatformAdministerGuard implements CanActivate {
  private readonly logger = new Logger(PlatformAdministerGuard.name);

  constructor(private readonly keto: KetoService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request.user?.userId;

    if (!userId) {
      this.logger.warn('PlatformAdministerGuard: No authenticated user in request');
      throw new UnauthorizedException('Authentication required');
    }

    const allowed = await this.keto.check({
      namespace: 'Platform',
      object: 'nova',
      relation: 'administer',
      subjectId: `user:${userId}`,
    });

    if (!allowed) {
      this.logger.warn(
        `PlatformAdministerGuard: User ${userId} denied — missing Platform:nova#administer`,
      );
      throw new ForbiddenException('Platform administer permission required');
    }

    return true;
  }
}
