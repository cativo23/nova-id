import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DemoMembershipAudit } from "./demo-membership-audit.entity";

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
    @InjectRepository(DemoMembershipAudit, "demo")
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
      // Log for diagnostics, then rethrow (#105). RolesController awaits
      // record() with no try/catch of its own — silently swallowing the
      // error here let a failed demo_membership_audit insert return 200
      // with the role mutation applied and no audit trail. Rethrowing lets
      // it propagate to Nest's exception filter (500) so the caller sees
      // the failure instead of a false-success response.
      this.logger.error(
        `[demo-audit] Failed to write audit record: ${(err as Error).message}`,
      );
      throw err;
    }
  }
}
