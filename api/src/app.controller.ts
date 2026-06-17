import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiOkResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './decorators/public.decorator';
import { GetUser } from './decorators/get-user.decorator';
import { AuthenticatedUser } from './common/types/authenticated-user';
import { AcceptHydraLoginDto } from './dto/accept-hydra-login.dto';
import { AcceptHydraConsentDto } from './dto/accept-hydra-consent.dto';
import { HydraRedirectResponseDto } from './dto/hydra-redirect-response.dto';

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
  @Post('hydra-accept-consent')
  async acceptHydraConsent(
    @GetUser() user: AuthenticatedUser,
    @Body() body: AcceptHydraConsentDto,
  ): Promise<HydraRedirectResponseDto> {
    return this.appService.acceptHydraConsent(user, body);
  }
}
