import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { KratosAdminService } from '../ory/kratos-admin.service';
import { PlatformManageUsersGuard } from '../guards/platform-manage-users.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SetUserStateDto } from './dto/set-user-state.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { PaginatedUsersDto } from './dto/paginated-users.dto';

@ApiTags('admin')
@ApiBearerAuth('oathkeeper-id-token')
@UseGuards(PlatformManageUsersGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly kratos: KratosAdminService) {}

  @Get()
  @ApiOperation({ summary: 'List all platform users (cursor-paginated)' })
  @ApiOkResponse({ type: PaginatedUsersDto, description: 'Page of users + optional next-page cursor' })
  @ApiResponse({ status: 401, description: 'Missing or invalid Bearer id_token' })
  @ApiResponse({ status: 403, description: 'Caller lacks Platform:nova#manage_users in Keto' })
  async list(@Query() query: ListUsersQueryDto): Promise<PaginatedUsersDto> {
    const { identities, nextPageToken } = await this.kratos.listIdentities({
      pageSize: query.pageSize,
      pageToken: query.pageToken,
    });
    return { data: identities.map(i => UserResponseDto.fromIdentity(i)), nextPageToken };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single user by Kratos identity id' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid Bearer id_token' })
  @ApiResponse({ status: 403, description: 'Caller lacks Platform:nova#manage_users in Keto' })
  @ApiResponse({ status: 404, description: 'Identity not found' })
  async get(@Param('id') id: string): Promise<UserResponseDto> {
    return UserResponseDto.fromIdentity(await this.kratos.getIdentity(id));
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a new platform user identity' })
  @ApiResponse({ status: 201, type: UserResponseDto, description: 'Identity created' })
  @ApiResponse({ status: 401, description: 'Missing or invalid Bearer id_token' })
  @ApiResponse({ status: 403, description: 'Caller lacks Platform:nova#manage_users in Keto' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @ApiResponse({ status: 422, description: 'Validation failed' })
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return UserResponseDto.fromIdentity(await this.kratos.createIdentity(dto));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Partially update user traits / role' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid Bearer id_token' })
  @ApiResponse({ status: 403, description: 'Caller lacks Platform:nova#manage_users in Keto' })
  @ApiResponse({ status: 404, description: 'Identity not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto): Promise<UserResponseDto> {
    return UserResponseDto.fromIdentity(await this.kratos.updateIdentity(id, dto));
  }

  @Patch(':id/state')
  @ApiOperation({ summary: 'Activate or deactivate a user identity' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid Bearer id_token' })
  @ApiResponse({ status: 403, description: 'Caller lacks Platform:nova#manage_users in Keto' })
  @ApiResponse({ status: 404, description: 'Identity not found' })
  async setState(@Param('id') id: string, @Body() dto: SetUserStateDto): Promise<UserResponseDto> {
    return UserResponseDto.fromIdentity(await this.kratos.setIdentityState(id, dto.state));
  }

  @Post(':id/recovery-link')
  @HttpCode(201)
  @ApiOperation({ summary: 'Generate a recovery link for a user' })
  @ApiResponse({ status: 201, description: 'Recovery link generated' })
  @ApiResponse({ status: 401, description: 'Missing or invalid Bearer id_token' })
  @ApiResponse({ status: 403, description: 'Caller lacks Platform:nova#manage_users in Keto' })
  @ApiResponse({ status: 404, description: 'Identity not found' })
  async recoveryLink(@Param('id') id: string): Promise<{ recovery_link: string }> {
    return { recovery_link: await this.kratos.createRecoveryLink(id) };
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a user identity permanently' })
  @ApiNoContentResponse({ description: 'Identity deleted' })
  @ApiResponse({ status: 401, description: 'Missing or invalid Bearer id_token' })
  @ApiResponse({ status: 403, description: 'Caller lacks Platform:nova#manage_users in Keto' })
  @ApiResponse({ status: 404, description: 'Identity not found' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.kratos.deleteIdentity(id);
  }
}
