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
import { InitUserRoles1750000000000 } from './migrations/1750000000000-InitUserRoles';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.DEMO_DB_PATH ?? 'data/app_roles.db',
      entities: [UserRole],
      migrations: [InitUserRoles1750000000000],
      // migrationsRun: true ensures the user_roles table is created on startup
      // in production where synchronize is OFF. In development, synchronize
      // remains active as a convenience (ADR-0001 rationale unchanged).
      migrationsRun: true,
      // synchronize is intentionally left enabled for non-production here.
      // Rationale (ADR-0001): the demo SQLite DB is ephemeral and dev/demo-only;
      // Auto-sync is harmless on a local, disposable file-based DB and avoids
      // the overhead of maintaining SQLite migrations for local dev workflow.
      // In production (NODE_ENV=production), migrationsRun handles schema init.
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
