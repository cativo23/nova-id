import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Configuration, IdentityApi, PermissionApi } from '@ory/client';
import { Configuration as HydraConfiguration, OAuth2Api } from '@ory/hydra-client';
import { KRATOS_IDENTITY_API, KETO_PERMISSION_API, HYDRA_OAUTH2_API } from './ory.constants';
import { KratosAdminService } from './kratos-admin.service';
import { KetoService } from './keto.service';
import { HydraService } from './hydra.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: KRATOS_IDENTITY_API,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new IdentityApi(new Configuration({ basePath: config.getOrThrow<string>('KRATOS_ADMIN_URL') })),
    },
    {
      provide: KETO_PERMISSION_API,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new PermissionApi(new Configuration({ basePath: config.getOrThrow<string>('KETO_READ_URL') })),
    },
    {
      provide: HYDRA_OAUTH2_API,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new OAuth2Api(new HydraConfiguration({ basePath: config.getOrThrow<string>('HYDRA_ADMIN_URL') })),
    },
    KratosAdminService,
    KetoService,
    HydraService,
  ],
  exports: [KratosAdminService, KetoService, HydraService],
})
export class OryModule {}
