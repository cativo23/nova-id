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
import { RolesService } from './roles.service';
import { AuthenticatedGuard } from '../../guards/authenticated.guard';
import { AppAdminGuard } from '../guards/app-admin.guard';
import { RoleGuard } from '../../guards/role.guard';
import { RequireRole } from '../../decorators/require-role.decorator';
import { GetUser } from '../../decorators/get-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { BootstrapAppAdminDto } from './dto/bootstrap-app-admin.dto';
import { SetUserRoleDto } from './dto/set-user-role.dto';
import { LogAccess } from '../log-access.decorator';
import { AuditService } from '../../audit/audit.service';

/** The single application managed by the demo roles module. */
const DEMO_APP_ID = process.env.APP_ID ?? 'nova-id-test-app';

@Controller('roles')
@UseGuards(AuthenticatedGuard)
@LogAccess()
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly audit: AuditService,
  ) {}

  // Bootstrap endpoint: platform_admin can set the first app_admin
  @Post('bootstrap/app-admin')
  @UseGuards(RoleGuard)
  @RequireRole('platform_admin')
  async bootstrapAppAdmin(
    @GetUser() user: AuthenticatedUser,
    @Body() dto: BootstrapAppAdminDto,
  ) {
    const targetUserId = dto.userId || user.userId;
    const userRole = await this.rolesService.setAppRole(targetUserId, 'app_admin');
    await this.audit.record({
      actorId: user.userId,
      action: 'membership.grant',
      appId: DEMO_APP_ID,
      targetId: targetUserId,
      targetType: 'user',
      metadata: { appRole: 'app_admin' },
    });
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
    @Body() dto: SetUserRoleDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    const userRole = await this.rolesService.setAppRole(userId, dto.appRole);
    await this.audit.record({
      actorId: user.userId,
      action: 'membership.grant',
      appId: DEMO_APP_ID,
      targetId: userId,
      targetType: 'user',
      metadata: { appRole: dto.appRole },
    });
    return {
      message: `User role set to ${dto.appRole}`,
      userRole,
    };
  }

  @Put('user/:userId')
  @UseGuards(AppAdminGuard)
  async updateUserRole(
    @Param('userId') userId: string,
    @Body() dto: SetUserRoleDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    const userRole = await this.rolesService.setAppRole(userId, dto.appRole);
    await this.audit.record({
      actorId: user.userId,
      action: 'membership.grant',
      appId: DEMO_APP_ID,
      targetId: userId,
      targetType: 'user',
      metadata: { appRole: dto.appRole },
    });
    return {
      message: `User role updated to ${dto.appRole}`,
      userRole,
    };
  }

  @Delete('user/:userId')
  @UseGuards(AppAdminGuard)
  async deleteUserRole(
    @Param('userId') userId: string,
    @GetUser() user: AuthenticatedUser,
  ) {
    await this.rolesService.deleteUserRole(userId);
    await this.audit.record({
      actorId: user.userId,
      action: 'membership.revoke',
      appId: DEMO_APP_ID,
      targetId: userId,
      targetType: 'user',
    });
    return {
      message: `User role deleted for ${userId}. Will default to app_user.`,
    };
  }
}
