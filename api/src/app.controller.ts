import { Controller, Get, Post, Body, Version, Query, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiOkResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './decorators/public.decorator';
import { GetUser } from './decorators/get-user.decorator';
import { AuthenticatedUser } from './common/types/authenticated-user';
import { AcceptHydraLoginDto } from './dto/accept-hydra-login.dto';
import { AcceptHydraConsentDto } from './dto/accept-hydra-consent.dto';
import { HydraRedirectResponseDto } from './dto/hydra-redirect-response.dto';
import { HydraConsentInfoResponseDto } from './dto/hydra-consent-info-response.dto';
import { RejectHydraConsentDto } from './dto/reject-hydra-consent.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

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

  @ApiTags('auth')
  @ApiOperation({ operationId: 'acceptHydraLogin', summary: 'Accept a Hydra login challenge for the signed-in user' })
  @ApiBody({ type: AcceptHydraLoginDto })
  @ApiOkResponse({ type: HydraRedirectResponseDto })
  @Version('1')
  @Post('hydra-accept-login')
  async acceptHydraLogin(
    @GetUser() user: AuthenticatedUser,
    @Body() body: AcceptHydraLoginDto,
  ): Promise<HydraRedirectResponseDto> {
    return this.appService.acceptHydraLogin(user, body.login_challenge);
  }

  @ApiTags('auth')
  @ApiOperation({ operationId: 'acceptHydraConsent', summary: 'Accept a Hydra consent challenge for the signed-in user' })
  @ApiBody({ type: AcceptHydraConsentDto })
  @ApiOkResponse({ type: HydraRedirectResponseDto })
  @Version('1')
  @Post('hydra-accept-consent')
  async acceptHydraConsent(
    @GetUser() user: AuthenticatedUser,
    @Body() body: AcceptHydraConsentDto,
  ): Promise<HydraRedirectResponseDto> {
    return this.appService.acceptHydraConsent(user, body);
  }

  @ApiTags('auth')
  @ApiOperation({ operationId: 'getHydraConsentInfo', summary: 'Get Hydra consent request info (server-side proxy)' })
  @ApiOkResponse({ type: HydraConsentInfoResponseDto })
  @Version('1')
  @Get('hydra-consent-info')
  async getHydraConsentInfo(
    @Query('consent_challenge') consentChallenge: string,
  ): Promise<HydraConsentInfoResponseDto> {
    if (!consentChallenge) {
      throw new BadRequestException('consent_challenge query param is required');
    }
    return this.appService.getHydraConsentInfo(consentChallenge);
  }

  @ApiTags('auth')
  @ApiOperation({ operationId: 'rejectHydraConsent', summary: 'Reject a Hydra consent challenge' })
  @ApiBody({ type: RejectHydraConsentDto })
  @ApiOkResponse({ type: HydraRedirectResponseDto })
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @Post('hydra-reject-consent')
  async rejectHydraConsent(
    @GetUser() user: AuthenticatedUser,
    @Body() body: RejectHydraConsentDto,
  ): Promise<HydraRedirectResponseDto> {
    return this.appService.rejectHydraConsent(user, body);
  }
}
