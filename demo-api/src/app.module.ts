import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { DemoModule } from "./demo/demo.module";
import { DemoAuthenticatedGuard } from "./guards/demo-authenticated.guard";
import { AppController } from "./app.controller";

/**
 * AppModule for demo-api — the standalone demo relying-party backend.
 *
 * Guard order:
 *   1. ThrottlerGuard — rate-limits every request by real client IP before auth.
 *   2. DemoAuthenticatedGuard — JWKS-verifies the Oathkeeper id_token RS256 JWT.
 *
 * demo-api is on the `apps` Docker network ONLY. It must never be on ory-internal.
 * Identity comes exclusively from the Oathkeeper id_token (JWKS_URL env var).
 * There is no direct Kratos/Hydra/Keto call anywhere in demo-api.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    DemoModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: DemoAuthenticatedGuard },
  ],
})
export class AppModule {}
