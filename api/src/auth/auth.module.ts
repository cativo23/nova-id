import { Module, Global } from '@nestjs/common';
import { AuthenticatedGuard } from '../guards/authenticated.guard';

/**
 * AuthModule — provides the single AuthenticatedGuard instance to the DI
 * container globally.
 *
 * The APP_GUARD binding lives in AppModule.providers (via useExisting, which
 * reuses this instance rather than constructing a second one) so that guard
 * execution order can be controlled explicitly: ThrottlerGuard is registered
 * first (throttles all requests, including unauthenticated ones) and
 * AuthenticatedGuard second (rejects unauth requests with 401 after rate-limit
 * headers have already been applied).
 */
@Global()
@Module({
  providers: [AuthenticatedGuard],
  exports: [AuthenticatedGuard],
})
export class AuthModule { }
