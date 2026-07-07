import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Server-side binding of a Hydra `login_challenge` to the Kratos identity that
 * first presented it while authenticated (VULN-0002 remediation).
 *
 * Why this table exists
 * ---------------------
 * `POST /hydra-accept-login` (non-skip path) used to accept ANY login_challenge
 * for whichever JWT-authenticated user called it. A second authenticated user
 * who obtained a victim's in-flight challenge could consume it (login DoS).
 * Hydra's login CSRF cookie already prevents session fixation / takeover, so the
 * impact was low — but this row makes the accept path fail-closed on ownership.
 *
 * Storage model — deliberately append-only (fits the least-privilege audit role)
 * ------------------------------------------------------------------------------
 * This entity lives on the SAME named 'audit' connection as AuditLog. The
 * runtime BFF role `nova_audit_app` holds ONLY INSERT/SELECT on tables the
 * migrator creates (ALTER DEFAULT PRIVILEGES ... GRANT INSERT, SELECT — see
 * docs/AUDIT_DB_LEAST_PRIVILEGE.md). This table needs no UPDATE/DELETE at
 * runtime:
 *   - "first-write-wins" is enforced by the UNIQUE constraint on loginChallenge:
 *     the first authenticated browser to present the challenge claims it; a
 *     second, different identity's INSERT for the same challenge fails.
 *   - single-use is already guaranteed by Hydra (accepting the challenge consumes
 *     it upstream), so we never need to delete a consumed binding.
 *   - expiry (TTL) is enforced at READ time (see LoginBindingService), not by
 *     deleting rows. Pruning old rows is an out-of-band operator/migrator task,
 *     exactly like audit-log retention — the runtime role intentionally cannot
 *     mutate this table.
 *
 * NO PHI is stored here: only a Kratos identity id (userId) and an opaque Hydra
 * challenge string.
 */
@Entity('login_challenge_bindings')
export class LoginChallengeBinding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * The Hydra login_challenge. UNIQUE so the binding is claimed exactly once
   * (first-write-wins); a later attempt to rebind the same challenge to another
   * identity is rejected at the storage layer.
   */
  @Index({ unique: true })
  @Column({ type: 'varchar' })
  loginChallenge: string;

  /** The Kratos identity id (JWT `sub`) that owns this challenge. */
  @Column({ type: 'varchar' })
  userId: string;

  /** Set by the database on INSERT. Used for read-time TTL evaluation. */
  @CreateDateColumn()
  createdAt: Date;
}
