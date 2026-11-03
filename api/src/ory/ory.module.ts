import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Configuration, IdentityApi, PermissionApi } from '@ory/client';
import { Configuration as HydraConfiguration, OAuth2Api } from '@ory/hydra-client';
import { KRATOS_IDENTITY_API, KETO_PERMISSION_API, HYDRA_OAUTH2_API } from './ory.constants';
import { KratosAdminService } from './kratos-admin.service';
import { KetoService } from './keto.service';
import { HydraService } from './hydra.service';

// Fail-closed guards (e.g. KetoService.check() returning false on any error)
// only fail closed *promptly* if the underlying HTTP call actually fails
// instead of hanging forever. None of the three Ory SDK clients had a
// timeout, so a black-holed route to Kratos/Keto/Hydra would hang the
// request (and the guard) indefinitely rather than erroring out quickly.
const DEFAULT_ORY_HTTP_TIMEOUT_MS = 5000;

function oryHttpTimeoutMs(config: ConfigService): number {
  // Env vars always arrive as strings; parse defensively rather than relying
  // on ConfigService's generic type parameter to coerce it.
  const raw = config.get('ORY_HTTP_TIMEOUT_MS');
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ORY_HTTP_TIMEOUT_MS;
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: KRATOS_IDENTITY_API,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new IdentityApi(
          new Configuration({
            basePath: config.getOrThrow<string>('KRATOS_ADMIN_URL'),
            baseOptions: { timeout: oryHttpTimeoutMs(config) },
          }),
        ),
    },
    {
      provide: KETO_PERMISSION_API,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new PermissionApi(
          new Configuration({
            basePath: config.getOrThrow<string>('KETO_READ_URL'),
            baseOptions: { timeout: oryHttpTimeoutMs(config) },
          }),
        ),
    },
    {
      provide: HYDRA_OAUTH2_API,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new OAuth2Api(
          new HydraConfiguration({
            basePath: config.getOrThrow<string>('HYDRA_ADMIN_URL'),
            baseOptions: { timeout: oryHttpTimeoutMs(config) },
          }),
        ),
    },
    KratosAdminService,
    KetoService,
    HydraService,
  ],
  exports: [KratosAdminService, KetoService, HydraService],
})
export class OryModule {}
