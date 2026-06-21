import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
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
import { HydraService } from '../ory/hydra.service';
import { PlatformAdministerGuard } from '../guards/platform-administer.guard';
import { AuditService } from '../audit/audit.service';
import { GetUser } from '../decorators/get-user.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { CreateOauth2ClientDto } from './dto/create-oauth2-client.dto';
import { UpdateOauth2ClientDto } from './dto/update-oauth2-client.dto';
import type { OAuth2Client } from '@ory/hydra-client';

@ApiTags('admin')
@ApiBearerAuth('oathkeeper-id-token')
@UseGuards(PlatformAdministerGuard)
@Controller({ path: 'admin/clients', version: '1' })
export class AdminClientsController {
  constructor(
    private readonly hydra: HydraService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all OAuth2 clients' })
  @ApiOkResponse({ description: 'Array of OAuth2 clients' })
  @ApiResponse({ status: 401, description: 'Missing or invalid Bearer id_token' })
  @ApiResponse({ status: 403, description: 'Caller lacks Platform:nova#administer in Keto' })
  async list(): Promise<OAuth2Client[]> {
    return this.hydra.listClients();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single OAuth2 client by id' })
  @ApiOkResponse({ description: 'OAuth2 client' })
  @ApiResponse({ status: 401, description: 'Missing or invalid Bearer id_token' })
  @ApiResponse({ status: 403, description: 'Caller lacks Platform:nova#administer in Keto' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  async get(@Param('id') id: string): Promise<OAuth2Client> {
    return this.hydra.getClient(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new OAuth2 client' })
  @ApiResponse({ status: 201, description: 'OAuth2 client created' })
  @ApiResponse({ status: 401, description: 'Missing or invalid Bearer id_token' })
  @ApiResponse({ status: 403, description: 'Caller lacks Platform:nova#administer in Keto' })
  @ApiResponse({ status: 422, description: 'Validation failed' })
  async create(
    @GetUser() actor: AuthenticatedUser,
    @Body() dto: CreateOauth2ClientDto,
  ): Promise<OAuth2Client> {
    const result = await this.hydra.createClient(dto as OAuth2Client);
    await this.audit.record({
      actorId: actor.userId,
      actorEmail: actor.email,
      action: 'oauth2_client.create',
      targetId: result.client_id ?? 'unknown',
      targetType: 'oauth2_client',
    });
    return result;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Replace an OAuth2 client (full update)' })
  @ApiOkResponse({ description: 'OAuth2 client updated' })
  @ApiResponse({ status: 401, description: 'Missing or invalid Bearer id_token' })
  @ApiResponse({ status: 403, description: 'Caller lacks Platform:nova#administer in Keto' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  @ApiResponse({ status: 422, description: 'Validation failed' })
  async update(
    @GetUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateOauth2ClientDto,
  ): Promise<OAuth2Client> {
    const result = await this.hydra.updateClient(id, dto as OAuth2Client);
    await this.audit.record({
      actorId: actor.userId,
      actorEmail: actor.email,
      action: 'oauth2_client.update',
      targetId: id,
      targetType: 'oauth2_client',
    });
    return result;
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete an OAuth2 client' })
  @ApiNoContentResponse({ description: 'Client deleted' })
  @ApiResponse({ status: 401, description: 'Missing or invalid Bearer id_token' })
  @ApiResponse({ status: 403, description: 'Caller lacks Platform:nova#administer in Keto' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  async remove(
    @GetUser() actor: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.hydra.deleteClient(id);
    await this.audit.record({
      actorId: actor.userId,
      actorEmail: actor.email,
      action: 'oauth2_client.delete',
      targetId: id,
      targetType: 'oauth2_client',
    });
  }
}
