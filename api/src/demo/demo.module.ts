import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesModule } from './roles/roles.module';
import { LogsModule } from './logs/logs.module';
import { DemoController } from './demo.controller';
import { DemoService } from './demo.service';
import { UserRole } from './roles/entities/user-role.entity';
import { DemoMembershipAudit } from './audit/demo-membership-audit.entity';
import { DemoAuditService } from './audit/demo-audit.service';
import { LoggingInterceptor } from './logging.interceptor';
import { InitDemoSchema1750100000000 } from './migrations/1750100000000-InitDemoSchema';

/**
 * DemoModule — named 'demo' Postgres connection backed by the demo_app DB.
 *
 * Naming this connection 'demo' prevents TypeORM from treating it as the
 * unnamed 'default' connection, which would conflict with TypeORM internals.
 *
 * Schema management: migrations only, in ALL environments.
 * - synchronize: false — never auto-mutate the schema.
 * - migrationsRun: true — TypeORM runs pending migrations on every boot.
 *
 * The standalone DataSource for the CLI lives in demo.datasource.ts.
 */
@Module({
  imports: [
    TypeOrmModule.forRoot({
      name: 'demo',
      type: 'postgres',
      host: process.env.DEMO_DB_HOST,
      port: parseInt(process.env.DEMO_DB_PORT ?? '5432', 10),
      username: process.env.DEMO_DB_USER,
      password: process.env.DEMO_DB_PASSWORD,
      database: process.env.DEMO_DB_NAME,
      entities: [UserRole, DemoMembershipAudit],
      migrations: [InitDemoSchema1750100000000],
      synchronize: false,
      migrationsRun: true,
    }),
    TypeOrmModule.forFeature([DemoMembershipAudit], 'demo'),
    RolesModule,
    LogsModule,
  ],
  controllers: [DemoController],
  providers: [
    DemoService,
    DemoAuditService,
    // LoggingInterceptor registered here so @UseInterceptors(LoggingInterceptor)
    // on DemoController resolves via DI (LogsService is provided by LogsModule above).
    LoggingInterceptor,
  ],
  exports: [RolesModule, LogsModule, DemoAuditService],
})
export class DemoModule {}
