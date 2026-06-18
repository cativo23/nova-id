import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesModule } from './roles/roles.module';
import { LogsModule } from './logs/logs.module';
import { LoggingInterceptor } from './logging.interceptor';
import { DemoController } from './demo.controller';
import { DemoService } from './demo.service';
import { DemoSeedService } from './demo-seed.service';
import { UserRole } from './roles/entities/user-role.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'data/app_roles.db',
      entities: [UserRole],
      // synchronize is intentionally left enabled for non-production here.
      // Rationale (ADR-0001): the demo SQLite DB is ephemeral and dev/demo-only;
      // it is never deployed to production. Auto-sync is harmless on a local,
      // disposable file-based DB and avoids the overhead of maintaining SQLite
      // migrations for a module that exists only to support local demos.
      // If this module is ever promoted to a real environment, migrate it properly.
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    RolesModule,
    LogsModule,
  ],
  controllers: [DemoController],
  providers: [
    DemoService,
    DemoSeedService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
  exports: [RolesModule, LogsModule],
})
export class DemoModule {}
