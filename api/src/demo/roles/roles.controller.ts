import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { AuthenticatedGuard } from '../../guards/authenticated.guard';
import { AppAdminGuard } from '../guards/app-admin.guard';
import { RoleGuard } from '../../guards/role.guard';
import { RequireRole } from '../../decorators/require-role.decorator';
import { Public } from '../../decorators/public.decorator';
import { GetUser } from '../../decorators/get-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { LogAccess } from '../log-access.decorator';

@Controller('roles')
@UseGuards(AuthenticatedGuard)
@LogAccess()
export class RolesController {
  constructor(private readonly rolesService: RolesService) { }

  // Bootstrap endpoint: platform_admin can set the first app_admin
  @Post('bootstrap/app-admin')
  @UseGuards(RoleGuard)
  @RequireRole('platform_admin')
  async bootstrapAppAdmin(
    @GetUser() user: AuthenticatedUser,
    @Body() body: { userId?: string },
  ) {
    const targetUserId = body.userId || user.userId;
    const userRole = await this.rolesService.setAppRole(targetUserId, 'app_admin');
    return {
      message: `User ${targetUserId} set as app_admin (bootstrap)`,
      userRole,
      note: 'This endpoint is only available to platform_admin for initial setup',
    };
  }

  @Get('my-role')
  async getMyRole(@GetUser() user: AuthenticatedUser) {
    // Always query DB to get the most up-to-date appRole
    const appRole = await this.rolesService.getAppRole(user.userId, true);
    return {
      userId: user.userId,
      email: user.email,
      platformRole: user.role, // From Keto (platform_user, platform_admin, etc.)
      appRole, // From SQLite (app_admin, app_user) - always from DB for accuracy
    };
  }

  @Get('all')
  @UseGuards(AppAdminGuard)
  async getAllRoles() {
    const roles = await this.rolesService.getAllUserRoles();
    return {
      roles,
      count: roles.length,
    };
  }

  @Get('user/:userId')
  @UseGuards(AppAdminGuard)
  async getUserRole(@Param('userId') userId: string) {
    const userRole = await this.rolesService.getUserRole(userId);
    if (!userRole) {
      return {
        userId,
        appRole: 'app_user', // Default
        message: 'No explicit role set, defaults to app_user',
      };
    }
    return userRole;
  }

  @Post('user/:userId')
  @UseGuards(AppAdminGuard)
  async setUserRole(
    @Param('userId') userId: string,
    @Body() body: { appRole: 'app_admin' | 'app_user' },
  ) {
    if (!body.appRole || !['app_admin', 'app_user'].includes(body.appRole)) {
      throw new BadRequestException('appRole must be "app_admin" or "app_user"');
    }
    const userRole = await this.rolesService.setAppRole(userId, body.appRole);
    return {
      message: `User role set to ${body.appRole}`,
      userRole,
    };
  }

  @Put('user/:userId')
  @UseGuards(AppAdminGuard)
  async updateUserRole(
    @Param('userId') userId: string,
    @Body() body: { appRole: 'app_admin' | 'app_user' },
  ) {
    if (!body.appRole || !['app_admin', 'app_user'].includes(body.appRole)) {
      throw new BadRequestException('appRole must be "app_admin" or "app_user"');
    }
    const userRole = await this.rolesService.setAppRole(userId, body.appRole);
    return {
      message: `User role updated to ${body.appRole}`,
      userRole,
    };
  }

  @Delete('user/:userId')
  @UseGuards(AppAdminGuard)
  async deleteUserRole(@Param('userId') userId: string) {
    await this.rolesService.deleteUserRole(userId);
    return {
      message: `User role deleted for ${userId}. Will default to app_user.`,
    };
  }
}
