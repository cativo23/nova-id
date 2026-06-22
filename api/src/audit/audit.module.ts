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
 * - migrationsRun: false — the RUNTIME app connects as the least-privilege
 *   `nova_audit_app` role, which holds only INSERT/SELECT on audit_logs and has
 *   NO DDL. It must never attempt migrations on boot (it would fail). Migrations
 *   are applied out-of-band by the privileged `nova_audit_migrator` role via the
 *   one-shot `api-migrate` compose service (profiles: ["migrate"]). This enforces
 *   append-only at the STORAGE layer: a fully-compromised BFF cannot
 *   UPDATE/DELETE/TRUNCATE the ledger. See docs/AUDIT_DB_LEAST_PRIVILEGE.md.
 * - The CLI DataSource for `npm run migration:*` (TS, dev) lives in
 *   audit.datasource.ts; the compiled runtime one used by api-migrate (prod
 *   image, no ts-node) lives in audit.datasource.runtime.ts.
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
      migrationsRun: false,
    }),
    TypeOrmModule.forFeature([AuditLog], 'audit'),
  ],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
