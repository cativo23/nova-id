import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { IdentityApi, Identity } from '@ory/client';
import { KRATOS_IDENTITY_API } from './ory.constants';
import { parseNextPageToken } from '../common/pagination';
import { httpStatus } from '../common/http-status';

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

export interface ListIdentitiesResult {
  identities: Identity[];
  /** Opaque Kratos cursor; null when no further pages exist. */
  nextPageToken: string | null;
}

/**
 * Extract a client-safe validation message from a Kratos error response.
 * Kratos's own error/UI messages are already written to be shown to end
 * users (no stack traces or internal paths), so it is safe to forward them
 * as-is — unlike a bare stack trace or DB error, which must never reach the
 * client.
 */
function kratosErrorMessage(err: unknown): string | undefined {
  const data = (err as any)?.response?.data;
  return data?.error?.message ?? data?.error?.reason ?? data?.message;
}

@Injectable()
export class KratosAdminService {
  private readonly logger = new Logger(KratosAdminService.name);
  // Matches kratos.local.yml identity.default_schema_id
  private readonly schemaId = 'default';

  constructor(@Inject(KRATOS_IDENTITY_API) private readonly identityApi: IdentityApi) {}

  async listIdentities(opts: { pageSize?: number; pageToken?: string } = {}): Promise<ListIdentitiesResult> {
    // Capture the full Axios response to read the Link header for next-page token.
    const response = await this.identityApi.listIdentities({
      pageSize: opts.pageSize ?? 100,
      pageToken: opts.pageToken,
    });
    const identities: Identity[] = response.data;
    const linkHeader: string | undefined = response.headers?.['link'] ?? response.headers?.['Link'];
    const nextPageToken = parseNextPageToken(linkHeader);
    return { identities, nextPageToken };
  }

  async getIdentity(id: string): Promise<Identity> {
    try {
      const { data } = await this.identityApi.getIdentity({ id });
      return data;
    } catch (err) {
      const status = httpStatus(err);
      if (status === 404) throw new NotFoundException(`Identity ${id} not found`);
      this.logger.error(`Kratos getIdentity failed for ${id}: ${(err as Error).message}`);
      throw new InternalServerErrorException('Kratos getIdentity failed');
    }
  }

  async createIdentity(input: CreateIdentityInput): Promise<Identity> {
    try {
      const { data } = await this.identityApi.createIdentity({
        createIdentityBody: {
          schema_id: this.schemaId,
          traits: { email: input.email, full_name: input.fullName },
          credentials: { password: { config: { password: input.password } } },
          // role sets the JWT `role` claim (via Oathkeeper id_token mutator reading
          // metadata_public.role) which gates RoleGuard / log access.
          // It does NOT grant Platform admin (manage_users/administer); that lives
          // in Keto and is wired in A1-plan-2.
          metadata_public: { role: input.role ?? 'platform_user' },
        },
      });
      return data;
    } catch (err) {
      const status = httpStatus(err);
      if (status === 409) {
        throw new ConflictException('Email already registered');
      }
      if (status === 400) {
        // Kratos returns 400 for BOTH a duplicate identifier AND unrelated
        // schema/password-policy violations. Blindly mapping every 400 to
        // "Email already registered" hid the real reason (e.g. a weak
        // password) behind a misleading message. Inspect the upstream
        // message: only a genuine duplicate-identifier signal maps to
        // Conflict; anything else surfaces as 422 with Kratos's own
        // (already user-safe) validation text.
        const reason = kratosErrorMessage(err);
        if (
          reason &&
          /duplicate|already (exists|registered|taken|in use)|exists already|identifier.*(exists|taken)/i.test(reason)
        ) {
          throw new ConflictException('Email already registered');
        }
        throw new UnprocessableEntityException(reason ?? 'The provided identity data is invalid.');
      }
      this.logger.error(`Kratos createIdentity failed: ${(err as Error).message}`);
      throw new InternalServerErrorException('Kratos createIdentity failed');
    }
  }

  async updateIdentity(id: string, input: UpdateIdentityInput): Promise<Identity> {
    // getIdentity already maps 404 → NotFoundException
    const current = await this.getIdentity(id);
    const traits = current.traits as { email: string; full_name: string };
    const metadata = (current.metadata_public as { role?: PlatformRole } | null) ?? {};
    try {
      const { data } = await this.identityApi.updateIdentity({
        id,
        updateIdentityBody: {
          schema_id: current.schema_id,
          traits: {
            email: input.email ?? traits.email,
            full_name: input.fullName ?? traits.full_name,
          },
          // role sets the JWT `role` claim (via Oathkeeper id_token mutator reading
          // metadata_public.role) which gates RoleGuard / log access.
          // It does NOT grant Platform admin (manage_users/administer); that lives
          // in Keto and is wired in A1-plan-2.
          metadata_public: { role: input.role ?? metadata.role ?? 'platform_user' },
          state: current.state ?? 'active',
        },
      });
      return data;
    } catch (err) {
      const status = httpStatus(err);
      if (status === 404) throw new NotFoundException(`Identity ${id} not found`);
      this.logger.error(`Kratos updateIdentity failed for ${id}: ${(err as Error).message}`);
      throw new InternalServerErrorException('Kratos updateIdentity failed');
    }
  }

  async setIdentityState(id: string, state: 'active' | 'inactive'): Promise<Identity> {
    // getIdentity already maps 404 → NotFoundException
    const current = await this.getIdentity(id);
    try {
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
    } catch (err) {
      const status = httpStatus(err);
      if (status === 404) throw new NotFoundException(`Identity ${id} not found`);
      this.logger.error(`Kratos setIdentityState failed for ${id}: ${(err as Error).message}`);
      throw new InternalServerErrorException('Kratos setIdentityState failed');
    }
  }

  async deleteIdentity(id: string): Promise<void> {
    try {
      await this.identityApi.deleteIdentity({ id });
    } catch (err) {
      const status = httpStatus(err);
      if (status === 404) throw new NotFoundException(`Identity ${id} not found`);
      this.logger.error(`Kratos deleteIdentity failed for ${id}: ${(err as Error).message}`);
      throw new InternalServerErrorException('Kratos deleteIdentity failed');
    }
  }

  async createRecoveryLink(id: string): Promise<string> {
    try {
      const { data } = await this.identityApi.createRecoveryLinkForIdentity({
        createRecoveryLinkForIdentityBody: { identity_id: id },
      });
      return data.recovery_link;
    } catch (err) {
      const status = httpStatus(err);
      if (status === 404) throw new NotFoundException(`Identity ${id} not found`);
      this.logger.error(`Kratos createRecoveryLink failed for ${id}: ${(err as Error).message}`);
      throw new InternalServerErrorException('Kratos createRecoveryLink failed');
    }
  }
}
