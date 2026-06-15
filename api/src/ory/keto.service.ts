import { Inject, Injectable, Logger } from '@nestjs/common';
import type { PermissionApi } from '@ory/client';
import { KETO_PERMISSION_API } from './ory.constants';

export interface KetoCheck {
  namespace: string;
  object: string;
  relation: string;
  subjectId: string; // e.g. "user:<kratosId>"
}

export interface PlatformFlags {
  manage_users: boolean;
  administer: boolean;
}

@Injectable()
export class KetoService {
  private readonly logger = new Logger(KetoService.name);

  constructor(@Inject(KETO_PERMISSION_API) private readonly permissionApi: PermissionApi) {}

  /** Fail-closed: returns false on ANY error (Keto down, network, non-200). */
  async check(input: KetoCheck): Promise<boolean> {
    try {
      const { data } = await this.permissionApi.checkPermission({
        namespace: input.namespace,
        object: input.object,
        relation: input.relation,
        subjectId: input.subjectId,
      });
      return data.allowed === true;
    } catch (err) {
      this.logger.warn(
        `Keto check failed (fail-closed deny) for ${input.namespace}:${input.object}#${input.relation}`,
      );
      return false;
    }
  }

  /** Fail-closed app-access check: is this user a member of App:<appId>? */
  async checkApp(userId: string, appId: string): Promise<boolean> {
    return this.check({
      namespace: 'App',
      object: appId,
      relation: 'access',
      subjectId: `user:${userId}`,
    });
  }

  /** Resolve the Platform-level permit flags for a Kratos identity id. */
  async checkPlatform(userId: string): Promise<PlatformFlags> {
    const subjectId = `user:${userId}`;
    const base = { namespace: 'Platform', object: 'nova', subjectId };
    const [manage_users, administer] = await Promise.all([
      this.check({ ...base, relation: 'manage_users' }),
      this.check({ ...base, relation: 'administer' }),
    ]);
    return { manage_users, administer };
  }
}
