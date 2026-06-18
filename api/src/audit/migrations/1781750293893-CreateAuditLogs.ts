import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAuditLogs1781750293893 implements MigrationInterface {
    name = 'CreateAuditLogs1781750293893'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "actorId" character varying NOT NULL, "actorEmail" character varying, "action" character varying NOT NULL, "appId" character varying, "targetId" character varying, "targetType" character varying, "metadata" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2dc33f7f3c22e2e7badafca1d1" ON "audit_logs" ("actorId") `);
        await queryRunner.query(`CREATE INDEX "IDX_cee5459245f652b75eb2759b4c" ON "audit_logs" ("action") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_cee5459245f652b75eb2759b4c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2dc33f7f3c22e2e7badafca1d1"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
    }

}
