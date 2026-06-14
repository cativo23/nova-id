import { Inject, Injectable, Logger } from '@nestjs/common';
import type { IdentityApi, Identity } from '@ory/client';
import { KRATOS_IDENTITY_API } from './ory.constants';

export type PlatformRole = 'platform_admin' | 'platform_user';

export interface CreateIdentityInput {
  email: string;
  fullName: string;
  password: string;
  role?: PlatformRole;
}

export interface UpdateIdentityInput {
  email?: string;
  fullName?: string;
  role?: PlatformRole;
}

@Injectable()
export class KratosAdminService {
  private readonly logger = new Logger(KratosAdminService.name);
  // Matches kratos.local.yml identity.default_schema_id
  private readonly schemaId = 'default';

  constructor(@Inject(KRATOS_IDENTITY_API) private readonly identityApi: IdentityApi) {}

  async listIdentities(opts: { pageSize?: number; pageToken?: string } = {}): Promise<Identity[]> {
    const { data } = await this.identityApi.listIdentities({
      pageSize: opts.pageSize ?? 100,
      pageToken: opts.pageToken,
    });
    return data;
  }

  async getIdentity(id: string): Promise<Identity> {
    const { data } = await this.identityApi.getIdentity({ id });
    return data;
  }

  async createIdentity(input: CreateIdentityInput): Promise<Identity> {
    const { data } = await this.identityApi.createIdentity({
      createIdentityBody: {
        schema_id: this.schemaId,
        traits: { email: input.email, full_name: input.fullName },
        credentials: { password: { config: { password: input.password } } },
        metadata_public: { role: input.role ?? 'platform_user' },
      },
    });
    return data;
  }

  async updateIdentity(id: string, input: UpdateIdentityInput): Promise<Identity> {
    const current = await this.getIdentity(id);
    const traits = current.traits as { email: string; full_name: string };
    const metadata = (current.metadata_public as { role?: PlatformRole } | null) ?? {};
    const { data } = await this.identityApi.updateIdentity({
      id,
      updateIdentityBody: {
        schema_id: current.schema_id,
        traits: {
          email: input.email ?? traits.email,
          full_name: input.fullName ?? traits.full_name,
        },
        metadata_public: { role: input.role ?? metadata.role ?? 'platform_user' },
        state: current.state ?? 'active',
      },
    });
    return data;
  }

  async setIdentityState(id: string, state: 'active' | 'inactive'): Promise<Identity> {
    const current = await this.getIdentity(id);
    const { data } = await this.identityApi.updateIdentity({
      id,
      updateIdentityBody: {
        schema_id: current.schema_id,
        traits: current.traits,
        metadata_public: current.metadata_public ?? undefined,
        state,
      },
    });
    return data;
  }

  async deleteIdentity(id: string): Promise<void> {
    await this.identityApi.deleteIdentity({ id });
  }

  async createRecoveryLink(id: string): Promise<string> {
    const { data } = await this.identityApi.createRecoveryLinkForIdentity({
      createRecoveryLinkForIdentityBody: { identity_id: id },
    });
    return data.recovery_link;
  }
}
