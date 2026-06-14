import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../decorators/get-user.decorator';
import { KetoService } from '../ory/keto.service';
import { PermissionsResponseDto } from './dto/permissions-response.dto';

@ApiTags('me')
@ApiBearerAuth('oathkeeper-id-token')
@Controller('me')
export class MeController {
  constructor(private readonly keto: KetoService) {}

  @Get('permissions')
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
