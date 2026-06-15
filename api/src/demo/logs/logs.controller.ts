import { Controller, Get, Query, Param, UseGuards, ForbiddenException, Request } from '@nestjs/common';
import { LogsService } from './logs.service';
import { AuthenticatedGuard } from '../../guards/authenticated.guard';
import { RolesService } from '../roles/roles.service';

@Controller('logs')
@UseGuards(AuthenticatedGuard)
export class LogsController {
  constructor(
    private readonly logsService: LogsService,
    private readonly rolesService: RolesService,
  ) { }

  // Helper to check if user has access (platform_admin OR app_admin)
  private async checkAccess(user: any): Promise<boolean> {
    if (user.role === 'platform_admin') return true
    // SQLite is the sole source of appRole (ADR-0002) — never read from JWT claim
    const appRole = await this.rolesService.getAppRole(user.userId)
    return appRole === 'app_admin'
  }

  @Get()
  async getLogs(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('frontend') frontend?: string,
    @Query('method') method?: string,
    @Query('status') status?: string,
    @Query('path') path?: string,
  ) {
    const user = req?.user
    if (!user || !(await this.checkAccess(user))) {
      throw new ForbiddenException('Access denied. Required role: platform_admin or app_admin')
    }
    const limitNum = limit ? parseInt(limit, 10) : 100;
    const hasFilters = method || status || path || frontend;
    if (hasFilters) {
      return this.logsService.getAccessLogsFiltered(limitNum, {
        method: method || undefined,
        status: status || undefined,
        path: path || undefined,
        frontend: frontend || undefined,
      });
    }
    return this.logsService.getAccessLogs(limitNum);
  }

  @Get('stats')
  async getStats(@Request() req: any) {
    const user = req?.user
    if (!user || !(await this.checkAccess(user))) {
      throw new ForbiddenException('Access denied. Required role: platform_admin or app_admin')
    }
    return this.logsService.getAccessStats();
  }

  @Get('frontend/:frontend')
  async getLogsByFrontend(@Request() req: any, @Param('frontend') frontend: string, @Query('limit') limit?: string) {
    const user = req?.user
    if (!user || !(await this.checkAccess(user))) {
      throw new ForbiddenException('Access denied. Required role: platform_admin or app_admin')
    }
    const limitNum = limit ? parseInt(limit, 10) : 100;
    return this.logsService.getAccessLogsByFrontend(frontend, limitNum);
  }

  @Get('user/:userId')
  async getLogsByUser(@Request() req: any, @Param('userId') userId: string, @Query('limit') limit?: string) {
    const user = req?.user
    if (!user || !(await this.checkAccess(user))) {
      throw new ForbiddenException('Access denied. Required role: platform_admin or app_admin')
    }
    const limitNum = limit ? parseInt(limit, 10) : 100;
    return this.logsService.getAccessLogsByUser(userId, limitNum);
  }
}
