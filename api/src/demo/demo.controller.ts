import {
  Controller, Get, Post, Put, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import { DemoService } from './demo.service';
import { RolesService } from './roles/roles.service';
import { GetUser } from '../decorators/get-user.decorator';
import { RequireRole } from '../decorators/require-role.decorator';
import { RoleGuard } from '../guards/role.guard';
import { AppAdminGuard } from './guards/app-admin.guard';
import { AppUserGuard } from './guards/app-user.guard';

@Controller()
export class DemoController {
  constructor(
    private readonly demoService: DemoService,
    private readonly rolesService: RolesService,
  ) {}

  @Get('me')
  @UseGuards(AppUserGuard)
  async getMe(@GetUser() user: any) {
    const appRole = await this.rolesService.getAppRole(user.userId);
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
    const appRole = await this.rolesService.getAppRole(user.userId);
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
    return this.demoService.getProtectedData(user);
  }

  @Get('user-demo')
  @UseGuards(AppUserGuard)
  getUserDemoData(@GetUser() user: any) {
    return this.demoService.getUserDemoData(user);
  }

  @Post('data')
  @UseGuards(AppUserGuard)
  createData(@GetUser() user: any, @Body() body: any) {
    return this.demoService.createData(user, body);
  }

  @Post('create')
  @UseGuards(AppUserGuard)
  createDataLegacy(@GetUser() user: any, @Body() body: any) {
    return this.demoService.createData(user, body);
  }

  @Get('app-user-data')
  @UseGuards(AppUserGuard)
  async getAppUserData(@GetUser() user: any) {
    return this.demoService.getAppUserData(user);
  }

  @Post('app-user-data')
  @UseGuards(AppUserGuard)
  async createAppUserData(@GetUser() user: any, @Body() body: any) {
    return this.demoService.createData(user, body);
  }

  @Get('admin-demo')
  @UseGuards(RoleGuard)
  @RequireRole('platform_admin')
  getAdminDemoData(@GetUser() user: any) {
    return this.demoService.getAdminDemoData(user);
  }

  @Get('app-admin-only')
  @UseGuards(AppAdminGuard)
  getAppAdminOnlyData(@GetUser() user: any) {
    return this.demoService.getAppAdminOnlyData(user);
  }

  @Post('app-admin/configure')
  @UseGuards(AppAdminGuard)
  configureAppAdmin(@GetUser() user: any, @Body() body: any) {
    return this.demoService.configureAppAdmin(user, body);
  }

  @Put(':id')
  updateData(@GetUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.demoService.updateData(user, id, body);
  }

  @Delete(':id')
  deleteData(@GetUser() user: any, @Param('id') id: string) {
    return this.demoService.deleteData(user, id);
  }
}
