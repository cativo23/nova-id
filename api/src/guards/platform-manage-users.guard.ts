import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { KetoService } from '../ory/keto.service';

/**
 * PlatformManageUsersGuard — Keto permission gate for Platform:nova#manage_users.
 *
 * Protects endpoints that manage the shared identity pool (e.g. listing/creating
 * platform users). Requires the caller to hold the `manage_users` relation on the
 * `Platform:nova` object in Keto.
 *
 * Fail-closed: any Keto error (service down, network failure) results in deny
 * because KetoService.check() already returns false on error.
 *
 * Must be applied AFTER AuthenticatedGuard (which populates request.user).
 */
@Injectable()
export class PlatformManageUsersGuard implements CanActivate {
  private readonly logger = new Logger(PlatformManageUsersGuard.name);

  constructor(private readonly keto: KetoService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request.user?.userId;

    if (!userId) {
      this.logger.warn('PlatformManageUsersGuard: No authenticated user in request');
      throw new ForbiddenException('Authentication required');
    }

    const allowed = await this.keto.check({
      namespace: 'Platform',
      object: 'nova',
      relation: 'manage_users',
      subjectId: `user:${userId}`,
    });

    if (!allowed) {
      this.logger.warn(
        `PlatformManageUsersGuard: User ${userId} denied — missing Platform:nova#manage_users`,
      );
      throw new ForbiddenException('Platform manage_users permission required');
    }

    return true;
  }
}
