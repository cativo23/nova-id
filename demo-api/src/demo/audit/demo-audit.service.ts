import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DemoMembershipAudit } from './demo-membership-audit.entity';

export interface DemoAuditRecord {
  actorId: string;
  action: string;
  appId: string;
  targetId: string;
  targetType: string;
  metadata?: Record<string, unknown>;
}

/**
 * DemoAuditService — demo-owned replacement for the IdP's AuditService.
 *
 * Writes membership audit events to the demo_app Postgres DB rather than
 * the IdP's nova_audit DB. The interface mirrors AuditService.record()
 * exactly so RolesController callsites need no behavioural changes.
 */
@Injectable()
export class DemoAuditService {
  private readonly logger = new Logger(DemoAuditService.name);

  constructor(
    @InjectRepository(DemoMembershipAudit, 'demo')
    private readonly repo: Repository<DemoMembershipAudit>,
  ) {}

  async record(entry: DemoAuditRecord): Promise<void> {
    try {
      await this.repo.save(
        this.repo.create({
          actorId: entry.actorId,
          action: entry.action,
          appId: entry.appId,
          targetId: entry.targetId,
          targetType: entry.targetType,
          metadata: entry.metadata ?? null,
        }),
      );
    } catch (err) {
      // Audit writes must never crash business flows — log and continue.
      this.logger.error(
        `[demo-audit] Failed to write audit record: ${(err as Error).message}`,
      );
    }
  }
}
