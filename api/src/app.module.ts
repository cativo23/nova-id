import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { OryModule } from './ory/ory.module';
import { AdminModule } from './admin/admin.module';
import { MeModule } from './me/me.module';
import { AuthenticatedGuard } from './guards/authenticated.guard';

/**
 * Guard execution order — NestJS runs APP_GUARDs in registration order.
 * ThrottlerGuard is registered FIRST so every request (including
 * unauthenticated ones) is rate-limited before AuthenticatedGuard rejects
 * it with 401.  Unauthenticated floods therefore consume their IP bucket
 * and receive 429 instead of escaping the limiter entirely.
 *
 * Trust-proxy is set to 1 in main.ts (single Oathkeeper hop, A0.4) so
 * req.ip resolves to the real client IP via X-Forwarded-For.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    AuditModule,
    AuthModule,
    OryModule,
    AdminModule,
    MeModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 1️⃣  Throttler runs first — gates ALL requests by real client IP.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // 2️⃣  Auth runs second — rejects unauthenticated requests with 401
    //     (after rate-limit headers have already been applied by guard #1).
    { provide: APP_GUARD, useClass: AuthenticatedGuard },
  ],
})
export class AppModule {}
