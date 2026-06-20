import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './audit-log.entity';
import { AuditService } from './audit.service';
import { CreateAuditLogs1781750293893 } from './migrations/1781750293893-CreateAuditLogs';

/**
 * AuditModule — registers a NAMED 'audit' TypeORM connection backed by
 * the nova_audit Postgres database.
 *
 * Naming this connection 'audit' is critical: it prevents TypeORM from
 * treating it as the unnamed 'default' connection and avoids conflicts with the
 * named 'demo' Postgres connection registered by DemoModule.
 *
 * Schema management: migrations only, in ALL environments.
 * - synchronize: false — never auto-mutate the schema. Use `npm run migration:generate`
 *   to produce a migration and `npm run migration:run` to apply it.
 * - migrationsRun: true — TypeORM runs pending migrations on every boot, so
 *   the table is created automatically in fresh dev/staging/prod environments
 *   without any manual step.
 * - The standalone DataSource for the CLI lives in audit.datasource.ts.
 */
@Module({
  imports: [
    TypeOrmModule.forRoot({
      name: 'audit',
      type: 'postgres',
      host: process.env.AUDIT_DB_HOST,
      port: parseInt(process.env.AUDIT_DB_PORT ?? '5432', 10),
      username: process.env.AUDIT_DB_USER,
      password: process.env.AUDIT_DB_PASSWORD,
      database: process.env.AUDIT_DB_NAME,
      entities: [AuditLog],
      migrations: [CreateAuditLogs1781750293893],
      synchronize: false,
      migrationsRun: true,
    }),
    TypeOrmModule.forFeature([AuditLog], 'audit'),
  ],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
