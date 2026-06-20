import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * InitDemoSchema — initial schema for the demo_app Postgres database.
 *
 * Creates two tables:
 *   user_roles            — app-level role assignments (migrated from SQLite).
 *   demo_membership_audit — demo-owned append-only audit trail (replaces
 *                           the previous writes to IdP's nova_audit DB).
 *
 * IF NOT EXISTS guards make the migration idempotent so migrationsRun: true
 * does not crash on environments that already ran an earlier schema setup.
 * gen_random_uuid() is Postgres 13+ core; no uuid-ossp extension required.
 */
export class InitDemoSchema1750100000000 implements MigrationInterface {
  name = 'InitDemoSchema1750100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // user_roles — mirrors the UserRole entity (formerly SQLite)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_roles" (
        "userId"    character varying(255) NOT NULL,
        "appRole"   character varying(50)  NOT NULL DEFAULT 'app_user',
        "createdAt" TIMESTAMP              NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP              NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_roles_userId" PRIMARY KEY ("userId")
      )
    `);

    // demo_membership_audit — demo-owned audit sink (replaces AuditModule writes)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "demo_membership_audit" (
        "id"         uuid                  NOT NULL DEFAULT gen_random_uuid(),
        "actorId"    character varying(255) NOT NULL,
        "action"     character varying(100) NOT NULL,
        "appId"      character varying(255) NOT NULL,
        "targetId"   character varying(255) NOT NULL,
        "targetType" character varying(100) NOT NULL,
        "metadata"   jsonb,
        "createdAt"  TIMESTAMP             NOT NULL DEFAULT now(),
        CONSTRAINT "PK_demo_membership_audit_id" PRIMARY KEY ("id")
      )
    `);

    // Indexes for common query patterns
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_demo_audit_actorId" ON "demo_membership_audit" ("actorId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_demo_audit_action" ON "demo_membership_audit" ("action")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_demo_audit_action"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_demo_audit_actorId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "demo_membership_audit"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_roles"`);
  }
}
