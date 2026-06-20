import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { UserRole } from './roles/entities/user-role.entity';
import { DemoMembershipAudit } from './audit/demo-membership-audit.entity';

/**
 * Standalone DataSource used exclusively by the TypeORM CLI
 * (migration:generate:demo, migration:run:demo, migration:revert:demo).
 *
 * NOT imported by the NestJS app — the app uses TypeOrmModule.forRoot()
 * with name:'demo' in DemoModule.
 *
 * Connection parameters mirror demo.module.ts exactly: same DEMO_DB_* env
 * vars, no silent defaults so the CLI fails fast on a missing var.
 *
 * Required export name: "default" — TypeORM CLI requires a default export.
 */
const DemoDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DEMO_DB_HOST,
  port: parseInt(process.env.DEMO_DB_PORT ?? '5432', 10),
  username: process.env.DEMO_DB_USER,
  password: process.env.DEMO_DB_PASSWORD,
  database: process.env.DEMO_DB_NAME,
  entities: [UserRole, DemoMembershipAudit],
  migrations: ['src/demo/migrations/*.ts'],
  /**
   * synchronize MUST be false — this DataSource is for migrations only.
   * Auto-sync would race with migration state tracking.
   */
  synchronize: false,
});

export default DemoDataSource;
