import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

/**
 * DemoMembershipAudit — demo-owned audit trail for app membership changes.
 *
 * Decoupled from the IdP's nova_audit DB (ADR-0001). Records the same fields
 * that were previously written to AuditService.record() so no audit data is
 * silently dropped. Lives on the 'demo' Postgres connection (demo_app DB).
 *
 * Schema is append-only: no UPDATE, no DELETE.
 */
@Entity("demo_membership_audit")
export class DemoMembershipAudit {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /** Kratos identity UUID of the actor who triggered the change. */
  @Column({ type: "varchar", length: 255 })
  actorId: string;

  /** Audit action label, e.g. 'membership.grant' or 'membership.revoke'. */
  @Column({ type: "varchar", length: 100 })
  action: string;

  /** The app whose membership changed (e.g. 'nova-id-test-app'). */
  @Column({ type: "varchar", length: 255 })
  appId: string;

  /** Kratos identity UUID of the user whose role was changed. */
  @Column({ type: "varchar", length: 255 })
  targetId: string;

  /** Target resource type, typically 'user'. */
  @Column({ type: "varchar", length: 100 })
  targetType: string;

  /** Optional structured metadata (e.g. { appRole: 'app_admin' }). */
  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
