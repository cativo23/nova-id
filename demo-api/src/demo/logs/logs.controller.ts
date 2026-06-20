import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { LogsService } from './logs.service';
import { AppAdminGuard } from '../guards/app-admin.guard';

/**
 * Access gate: AppAdminGuard (class-level) enforces that the caller
 * has app role app_admin in demo_app Postgres (ADR-0002 / ADR-0003, strict layering).
 * platform_admin does NOT grant access — only demo_app Postgres app_admin does.
 *
 * The global AuthenticatedGuard (registered as APP_GUARD in AppModule)
 * already ensures every caller is authenticated before AppAdminGuard runs.
 */
@Controller('logs')
@UseGuards(AppAdminGuard)
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  async getLogs(
    @Query('limit') limit?: string,
    @Query('frontend') frontend?: string,
    @Query('method') method?: string,
    @Query('status') status?: string,
    @Query('path') path?: string,
  ) {
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
  async getStats() {
    return this.logsService.getAccessStats();
  }

  @Get('frontend/:frontend')
  async getLogsByFrontend(
    @Param('frontend') frontend: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    return this.logsService.getAccessLogsByFrontend(frontend, limitNum);
  }

  @Get('user/:userId')
  async getLogsByUser(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    return this.logsService.getAccessLogsByUser(userId, limitNum);
  }
}
