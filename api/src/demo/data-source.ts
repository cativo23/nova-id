import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { UserRole } from './roles/entities/user-role.entity';
import { InitUserRoles1750000000000 } from './migrations/1750000000000-InitUserRoles';

/**
 * Standalone DataSource used exclusively by the TypeORM CLI (migration:run,
 * migration:revert, migration:show for the demo SQLite store). It is NOT
 * imported by the NestJS app module — the app uses TypeOrmModule.forRoot()
 * in DemoModule.
 *
 * Connection parameters mirror demo.module.ts exactly: reads DEMO_DB_PATH
 * from env or falls back to data/app_roles.db.
 *
 * Required export name: "default" — TypeORM CLI requires a default export.
 */
const AppRolesDataSource = new DataSource({
  type: 'sqlite',
  database: process.env.DEMO_DB_PATH ?? 'data/app_roles.db',
  entities: [UserRole],
  migrations: [InitUserRoles1750000000000],
  /**
   * synchronize MUST be false here. This DataSource is for migrations only;
   * auto-sync would race with (and potentially corrupt) the migration state.
   */
  synchronize: false,
});

export default AppRolesDataSource;
