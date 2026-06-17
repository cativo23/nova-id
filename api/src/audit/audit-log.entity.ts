import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Append-only audit log row.
 *
 * Healthcare constraint: NO PHI stored here.
 * - actorId/actorEmail: admin user performing the action (fine; not patient data).
 * - targetId: opaque ID (UUID) of the affected resource — never a patient name.
 * - metadata: free-form context (e.g. { "app_id": "..." }) — callers MUST NOT
 *   include patient names, SSNs, diagnoses, or any PHI in this column.
 *
 * There is intentionally no updatedAt or version column. Rows must never be
 * mutated after insertion; the table is a write-once ledger.
 */
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The Kratos identity id of the admin who performed the action. */
  @Index()
  @Column({ type: 'varchar' })
  actorId: string;

  /** The admin's email at time of the action (denormalised for readability in the audit UI). */
  @Column({ type: 'varchar', nullable: true })
  actorEmail: string | null;

  /**
   * Action verb in dot-notation, e.g.:
   *   user.create | user.update | user.delete | user.state
   *   recovery.trigger | membership.grant | membership.revoke
   */
  @Index()
  @Column({ type: 'varchar' })
  action: string;

  /** The OAuth client / application involved, if applicable. */
  @Column({ type: 'varchar', nullable: true })
  appId: string | null;

  /** Opaque UUID of the resource that was affected (never a human-readable name). */
  @Column({ type: 'varchar', nullable: true })
  targetId: string | null;

  /** Resource type discriminator, e.g. 'user' | 'membership'. */
  @Column({ type: 'varchar', nullable: true })
  targetType: string | null;

  /**
   * Freeform context for the action. Callers MUST NOT include PHI.
   * Acceptable: { "scopes": ["openid"], "previous_state": "active" }
   * Forbidden:  { "patient_name": "...", "dob": "..." }
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  /** Wall-clock timestamp set by the database on INSERT. Never overridden. */
  @CreateDateColumn()
  createdAt: Date;
}
