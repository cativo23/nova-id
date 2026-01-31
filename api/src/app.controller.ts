import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AppService } from './app.service';
import { RolesService } from './roles/roles.service';
import { Public } from './decorators/public.decorator';
import { GetUser } from './decorators/get-user.decorator';
import { RequireRole } from './decorators/require-role.decorator';
import { RoleGuard } from './guards/role.guard';
import { AppAdminGuard } from './guards/app-admin.guard';
import { AppUserGuard } from './guards/app-user.guard';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly rolesService: RolesService,
  ) { }

  // --- Public (no auth) ---
  @Get('health')
  @Public()
  getHealth() {
    return {
      status: 'ok',
      service: 'nova-id-api',
      timestamp: new Date().toISOString(),
      oryIntegration: true,
    };
  }

  @Get('public')
  @Public()
  getPublicData() {
    return this.appService.getPublicData();
  }

  // --- Auth required (app_user o app_admin) ---
  @Get('me')
  @UseGuards(AppUserGuard)
  async getMe(@GetUser() user: any) {
    const appRole = user.appRole ?? (await this.rolesService.getAppRole(user.userId));
    return {
      user: {
        id: user.userId,
        email: user.email,
        full_name: user.full_name,
        name: user.full_name,
        role: user.role ?? 'platform_user',
        appRole: appRole ?? 'app_user',
      },
    };
  }

  @Get('nova-id-session')
  @UseGuards(AppUserGuard)
  async getNovaIdSession(@GetUser() user: any) {
    const appRole = user.appRole ?? (await this.rolesService.getAppRole(user.userId));
    return {
      identity: {
        id: user.userId,
        traits: {
          email: user.email,
          full_name: user.full_name,
          role: user.role ?? 'platform_user',
          appRole: appRole ?? 'app_user',
        },
      },
    };
  }

  @Get('protected')
  @UseGuards(AppUserGuard)
  getProtectedData(@GetUser() user: any) {
    return this.appService.getProtectedData(user);
  }

  @Get('user-demo')
  @UseGuards(AppUserGuard)
  getUserDemoData(@GetUser() user: any) {
    return this.appService.getUserDemoData(user);
  }

  @Post('data')
  @UseGuards(AppUserGuard)
  createData(@GetUser() user: any, @Body() body: any) {
    return this.appService.createData(user, body);
  }

  @Post('create')
  @UseGuards(AppUserGuard)
  createDataLegacy(@GetUser() user: any, @Body() body: any) {
    return this.appService.createData(user, body);
  }

  // --- App user data (auth + app_user or app_admin) ---
  @Get('app-user-data')
  @UseGuards(AppUserGuard)
  async getAppUserData(@GetUser() user: any) {
    return this.appService.getAppUserData(user);
  }

  @Post('app-user-data')
  @UseGuards(AppUserGuard)
  async createAppUserData(@GetUser() user: any, @Body() body: any) {
    return this.appService.createData(user, body);
  }

  // --- Platform admin only ---
  @Get('admin-demo')
  @UseGuards(RoleGuard)
  @RequireRole('platform_admin')
  getAdminDemoData(@GetUser() user: any) {
    return this.appService.getAdminDemoData(user);
  }

  // --- App admin only ---
  @Get('app-admin-only')
  @UseGuards(AppAdminGuard)
  getAppAdminOnlyData(@GetUser() user: any) {
    return this.appService.getAppAdminOnlyData(user);
  }

  @Post('app-admin/configure')
  @UseGuards(AppAdminGuard)
  configureAppAdmin(@GetUser() user: any, @Body() body: any) {
    return this.appService.configureAppAdmin(user, body);
  }

  // --- CRUD (parametric routes last) ---
  @Put(':id')
  updateData(@GetUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.appService.updateData(user, id, body);
  }

  @Delete(':id')
  deleteData(@GetUser() user: any, @Param('id') id: string) {
    return this.appService.deleteData(user, id);
  }

  // --- Hydra (OAuth2) Flow ---
  @Post('hydra-accept-login')
  @UseGuards(AppUserGuard)
  async acceptHydraLogin(
    @GetUser() user: any,
    @Body() body: { login_challenge: string },
  ) {
    return this.appService.acceptHydraLogin(user, body.login_challenge);
  }

  @Post('hydra-accept-consent')
  @UseGuards(AppUserGuard)
  async acceptHydraConsent(@GetUser() user: any, @Body() body: any) {
    return this.appService.acceptHydraConsent(user, body);
  }
}
