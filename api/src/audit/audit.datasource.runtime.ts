import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { AuditLog } from './audit-log.entity';

/**
 * Runtime DataSource — compiled to dist/audit/audit.datasource.runtime.js.
 *
 * Used ONLY by the one-shot `api-migrate` compose service to apply audit
 * migrations inside the PRODUCTION image. That image runs `npm ci --only=production`
 * and removes npm (api/Dockerfile), so it has NO ts-node/typescript and the `.ts`
 * sources are absent — `npm run migration:run` (the typeorm-ts-node-commonjs
 * variant in package.json) cannot run there. Instead the migrate service invokes
 * the plain compiled CLI with the migrator credentials:
 *
 *   node node_modules/typeorm/cli.js migration:run \
 *     -d dist/audit/audit.datasource.runtime.js
 *
 * It mirrors audit.datasource.ts but globs COMPILED migrations under dist/. Like
 * that file it is NEVER imported by the NestJS app (AuditModule uses
 * TypeOrmModule.forRoot) — it exists purely for the TypeORM CLI.
 *
 * synchronize MUST stay false: this DataSource is for migrations only.
 */
const AuditRuntimeDataSource = new DataSource({
  type: 'postgres',
  host: process.env.AUDIT_DB_HOST,
  port: parseInt(process.env.AUDIT_DB_PORT ?? '5432', 10),
  username: process.env.AUDIT_DB_USER,
  password: process.env.AUDIT_DB_PASSWORD,
  database: process.env.AUDIT_DB_NAME,
  entities: [AuditLog],
  migrations: ['dist/audit/migrations/*.js'],
  synchronize: false,
});

export default AuditRuntimeDataSource;
