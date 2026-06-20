import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { RolesService } from '../roles/roles.service';

@Injectable()
export class AppUserGuard implements CanActivate {
  private readonly logger = new Logger(AppUserGuard.name);

  constructor(private rolesService: RolesService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      this.logger.warn('AppUserGuard: No user in request');
      throw new ForbiddenException('User not authenticated');
    }

    // demo_app Postgres is the sole source of appRole (ADR-0002) — never read from JWT claim
    const appRole = await this.rolesService.getAppRole(user.userId);

    // Both app_admin and app_user can access endpoints protected by AppUserGuard
    if (appRole !== 'app_admin' && appRole !== 'app_user') {
      this.logger.warn(`AppUserGuard: User ${user.userId} has invalid app role: ${appRole}`);
      throw new ForbiddenException(`Access denied. Invalid app role: ${appRole}`);
    }

    // Add appRole to user object for use in controllers
    request.user.appRole = appRole;

    return true;
  }
}
