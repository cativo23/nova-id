import {
  Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { KratosAdminService } from '../ory/kratos-admin.service';
import { PlatformManageUsersGuard } from '../guards/platform-manage-users.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SetUserStateDto } from './dto/set-user-state.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UserResponseDto } from './dto/user-response.dto';

@ApiTags('admin')
@ApiBearerAuth('oathkeeper-id-token')
@UseGuards(PlatformManageUsersGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly kratos: KratosAdminService) {}

  @Get()
  async list(@Query() query: ListUsersQueryDto): Promise<UserResponseDto[]> {
    const identities = await this.kratos.listIdentities({ pageSize: query.pageSize, pageToken: query.pageToken });
    return identities.map(i => UserResponseDto.fromIdentity(i));
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<UserResponseDto> {
    return UserResponseDto.fromIdentity(await this.kratos.getIdentity(id));
  }

  @Post()
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return UserResponseDto.fromIdentity(await this.kratos.createIdentity(dto));
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto): Promise<UserResponseDto> {
    return UserResponseDto.fromIdentity(await this.kratos.updateIdentity(id, dto));
  }

  @Put(':id/state')
  async setState(@Param('id') id: string, @Body() dto: SetUserStateDto): Promise<UserResponseDto> {
    return UserResponseDto.fromIdentity(await this.kratos.setIdentityState(id, dto.state));
  }

  @Post(':id/recovery-link')
  async recoveryLink(@Param('id') id: string): Promise<{ recovery_link: string }> {
    return { recovery_link: await this.kratos.createRecoveryLink(id) };
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.kratos.deleteIdentity(id);
  }
}
