import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesService } from '../roles/roles.service';

@Injectable()
export class AppAdminGuard implements CanActivate {
  private readonly logger = new Logger(AppAdminGuard.name);

  constructor(
    private reflector: Reflector,
    private rolesService: RolesService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      this.logger.warn('AppAdminGuard: No user in request');
      throw new ForbiddenException('User not authenticated');
    }

    // demo_app Postgres is the sole source of appRole (ADR-0002) — never read from JWT claim
    const appRole = await this.rolesService.getAppRole(user.userId);

    if (appRole !== 'app_admin') {
      this.logger.warn(`AppAdminGuard: User ${user.userId} has role ${appRole}, required app_admin`);
      throw new ForbiddenException(`Access denied. Required app role: app_admin. Your app role: ${appRole}`);
    }

    // Add appRole to user object for use in controllers
    request.user.appRole = appRole;

    return true;
  }
}
