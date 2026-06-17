import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';

export interface RecordAuditEntry {
  actorId: string;
  actorEmail?: string | null;
  action: string;
  appId?: string | null;
  targetId?: string | null;
  targetType?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * AuditService — append-only audit trail writer.
 *
 * Design decision — error swallowing:
 * An audit-write failure MUST NOT break the primary admin operation because
 * the mutation has already succeeded by the time we reach this point. Rather
 * than rolling back a completed action (which would leave the system in an
 * inconsistent state), we log the failure at ERROR level so it surfaces in
 * monitoring/alerting and continue. This is a best-effort durable write.
 *
 * Trade-off: a sustained DB outage means audit records are silently dropped
 * until the operator notices the error logs. Mitigation: ship the error to
 * the logging/alerting pipeline (e.g. Sentry) in production.
 *
 * This service exposes ONLY record(). There are intentionally no update,
 * delete, or remove methods — the audit_logs table is a write-once ledger.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog, 'audit')
    private readonly repo: Repository<AuditLog>,
  ) {}

  /**
   * Append an audit entry.
   *
   * Never throws — errors are caught and logged so the calling admin operation
   * is not disrupted. See class-level comment for rationale.
   */
  async record(entry: RecordAuditEntry): Promise<void> {
    try {
      const row = this.repo.create({
        actorId: entry.actorId,
        actorEmail: entry.actorEmail ?? null,
        action: entry.action,
        appId: entry.appId ?? null,
        targetId: entry.targetId ?? null,
        targetType: entry.targetType ?? null,
        metadata: entry.metadata ?? null,
      });
      await this.repo.save(row);
    } catch (err) {
      // Best-effort: log and swallow so the primary operation is not disrupted.
      this.logger.error(
        `Audit write failed for action="${entry.action}" actor="${entry.actorId}": ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }
}
