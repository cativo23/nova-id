import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the user_roles table for the demo SQLite store.
 *
 * SQLite dialect — all column types are SQLite-native (TEXT, DATETIME).
 * IF NOT EXISTS makes the migration idempotent: safe to run against a DB that
 * was previously created by synchronize (local dev) and is now being promoted
 * without a clean slate.
 *
 * Column mapping (entity → DDL):
 *   userId     → TEXT PRIMARY KEY (varchar PrimaryColumn, length 255)
 *   appRole    → TEXT NOT NULL DEFAULT 'app_user' (varchar Column, length 50)
 *   createdAt  → DATETIME NOT NULL DEFAULT (datetime('now')) (CreateDateColumn)
 *   updatedAt  → DATETIME NOT NULL DEFAULT (datetime('now')) (UpdateDateColumn)
 */
export class InitUserRoles1750000000000 implements MigrationInterface {
  name = 'InitUserRoles1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_roles" (
        "userId"    TEXT NOT NULL,
        "appRole"   TEXT NOT NULL DEFAULT 'app_user',
        "createdAt" DATETIME NOT NULL DEFAULT (datetime('now')),
        "updatedAt" DATETIME NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY ("userId")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_roles"`);
  }
}
