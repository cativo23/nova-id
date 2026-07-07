import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * VULN-0002: server-side login_challenge -> Kratos-identity binding table.
 *
 * Applied by the privileged `nova_audit_migrator` role via the one-shot
 * `api-migrate` compose service (same path as CreateAuditLogs). The runtime
 * `nova_audit_app` role automatically receives INSERT/SELECT (and nothing else)
 * on this table via the existing `ALTER DEFAULT PRIVILEGES FOR ROLE
 * nova_audit_migrator ... GRANT INSERT, SELECT ON TABLES TO nova_audit_app`
 * grant — no infra change is required. Append-only at the storage layer, exactly
 * like audit_logs.
 */
export class CreateLoginChallengeBindings1781750293894 implements MigrationInterface {
    name = 'CreateLoginChallengeBindings1781750293894'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // gen_random_uuid() is PostgreSQL core (13+); mirrors CreateAuditLogs to
        // avoid the uuid-ossp extension. IF NOT EXISTS keeps it idempotent.
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "login_challenge_bindings" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "loginChallenge" character varying NOT NULL, "userId" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_login_challenge_bindings" PRIMARY KEY ("id"))`);
        // UNIQUE index enforces first-write-wins: a challenge can be claimed once.
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_login_challenge_bindings_challenge" ON "login_challenge_bindings" ("loginChallenge") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."UQ_login_challenge_bindings_challenge"`);
        await queryRunner.query(`DROP TABLE "login_challenge_bindings"`);
    }

}
