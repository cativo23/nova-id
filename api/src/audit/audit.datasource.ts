import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { AuditLog } from './audit-log.entity';

/**
 * Standalone DataSource used exclusively by the TypeORM CLI (migration:generate,
 * migration:run, migration:revert). It is NOT imported by the NestJS app module
 * — the app uses TypeOrmModule.forRoot() in AuditModule.
 *
 * Connection parameters mirror audit.module.ts exactly: same AUDIT_DB_* env vars,
 * same lack of silent defaults (fail fast on a missing var rather than connect to
 * a stray localhost/postgres DB and generate a migration against the wrong schema).
 *
 * Required export name: "default" — TypeORM CLI requires a default export.
 */
const AuditDataSource = new DataSource({
  type: 'postgres',
  host: process.env.AUDIT_DB_HOST,
  port: parseInt(process.env.AUDIT_DB_PORT ?? '5432', 10),
  username: process.env.AUDIT_DB_USER,
  password: process.env.AUDIT_DB_PASSWORD,
  database: process.env.AUDIT_DB_NAME,
  entities: [AuditLog],
  migrations: ['src/audit/migrations/*.ts'],
  /**
   * synchronize MUST be false here. This DataSource is for migrations only;
   * auto-sync would race with (and potentially corrupt) the migration state.
   */
  synchronize: false,
});

export default AuditDataSource;
