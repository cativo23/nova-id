import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './decorators/public.decorator';
import { GetUser } from './decorators/get-user.decorator';
import { AppUserGuard } from './demo/guards/app-user.guard';

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
  @Post('hydra-accept-login')
  @UseGuards(AppUserGuard)
  async acceptHydraLogin(@GetUser() user: any, @Body() body: { login_challenge: string }) {
    return this.appService.acceptHydraLogin(user, body.login_challenge);
  }

  @ApiTags('auth')
  @ApiOperation({ operationId: 'acceptHydraConsent', summary: 'Accept a Hydra consent challenge for the signed-in user' })
  @Post('hydra-accept-consent')
  @UseGuards(AppUserGuard)
  async acceptHydraConsent(@GetUser() user: any, @Body() body: any) {
    return this.appService.acceptHydraConsent(user, body);
  }
}
