import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { AuditLog } from './audit-log.entity';

/**
 * Standalone DataSource used exclusively by the TypeORM CLI (migration:generate,
 * migration:run, migration:revert). It is NOT imported by the NestJS app module
 * — the app uses TypeOrmModule.forRoot() in AuditModule.
 *
 * Connection parameters mirror audit.module.ts exactly: all read from the same
 * AUDIT_DB_* environment variables so the same .env file drives both paths.
 *
 * Required export name: "default" — TypeORM CLI requires a default export.
 */
const AuditDataSource = new DataSource({
  type: 'postgres',
  host: process.env.AUDIT_DB_HOST ?? 'localhost',
  port: parseInt(process.env.AUDIT_DB_PORT ?? '5432', 10),
  username: process.env.AUDIT_DB_USER ?? 'postgres',
  password: process.env.AUDIT_DB_PASSWORD,
  database: process.env.AUDIT_DB_NAME ?? 'nova_audit',
  entities: [AuditLog],
  migrations: ['src/audit/migrations/*.ts'],
  /**
   * synchronize MUST be false here. This DataSource is for migrations only;
   * auto-sync would race with (and potentially corrupt) the migration state.
   */
  synchronize: false,
});

export default AuditDataSource;
