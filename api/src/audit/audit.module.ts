import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './audit-log.entity';
import { AuditService } from './audit.service';

/**
 * AuditModule — registers a NAMED 'audit' TypeORM connection backed by
 * the nova_audit Postgres database.
 *
 * Naming this connection 'audit' is critical: it prevents TypeORM from
 * treating it as the default connection and avoids conflicts with the
 * existing SQLite 'default' connection registered by DemoModule.
 *
 * synchronize=true in non-production is intentional for local dev only;
 * production must use explicit migrations (follow-up task A2-plan-2).
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
      // Dev-only schema sync: creates audit_logs on first boot. Never in production —
      // use explicit TypeORM migrations instead (follow-up).
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    TypeOrmModule.forFeature([AuditLog], 'audit'),
  ],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
