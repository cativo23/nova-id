import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../decorators/get-user.decorator';
import { KetoService } from '../ory/keto.service';
import { PermissionsResponseDto } from './dto/permissions-response.dto';

@ApiTags('me')
@ApiBearerAuth('oathkeeper-id-token')
@Controller('me')
export class MeController {
  constructor(private readonly keto: KetoService) {}

  @Get('permissions')
  @ApiOperation({ summary: 'Resolve the caller\'s Platform-level Keto permissions' })
  @ApiOkResponse({ type: PermissionsResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid Bearer id_token' })
  async permissions(@GetUser() user: { userId: string }): Promise<PermissionsResponseDto> {
    const { manage_users, administer } = await this.keto.checkPlatform(user.userId);
    return {
      userId: user.userId,
      administer,
      manageUsers: manage_users,
      canViewUsers: manage_users,
      canManageUsers: manage_users,
      canManagePermissions: administer,
      canAccessAdmin: administer,
    };
  }
}
