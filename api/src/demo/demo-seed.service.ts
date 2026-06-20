import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { RolesService } from './roles/roles.service';

/**
 * DemoSeedService — Idempotent bootstrap seed for the demo SQLite store.
 *
 * WHY: After the ADR-0003 strict-layering fix, platform_admin no longer grants
 * app-domain log access. admin@nova.test must therefore be seeded as app_admin
 * in SQLite so the demo remains functional. This service resolves the identity
 * UUID from the Kratos Admin API (reachable on the ory-internal Docker network)
 * and upserts the app_admin role on every startup.
 *
 * CONTRACT:
 *   - Only runs when KRATOS_ADMIN_URL is set (i.e. inside the Docker stack).
 *   - setAppRole is idempotent — safe to re-run any number of times.
 *   - Does NOT touch Keto, the IdP schema, or any production data path.
 *   - Failures are logged as warnings, never crash the application.
 */
@Injectable()
export class DemoSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DemoSeedService.name);

  // Emails to promote to app_admin on every boot. Extend for future demo seeds.
  private readonly DEMO_APP_ADMINS = ['admin@nova.test'];

  constructor(private readonly rolesService: RolesService) {}

  async onApplicationBootstrap(): Promise<void> {
    // Never seed the local demo fixtures in production. The *.nova.test demo
    // identities do not exist in a real deployment, so this would only emit
    // noisy "identity not found" warnings on every boot. Production app-admin
    // grants are provisioned explicitly per identity, not via this fixture seed.
    if (process.env.NODE_ENV === 'production') {
      this.logger.debug('NODE_ENV=production — skipping demo SQLite seed.');
      return;
    }

    const kratosAdminUrl = process.env.KRATOS_ADMIN_URL;
    if (!kratosAdminUrl) {
      this.logger.debug('KRATOS_ADMIN_URL not set — skipping demo SQLite seed.');
      return;
    }

    this.logger.log('[demo-seed] Starting SQLite app_admin seed...');

    // Fetch all identities with pagination (per_page=200) and a 10 s timeout.
    let identities: Array<{ id: string; traits?: { email?: string } }>;
    try {
      identities = await this.fetchAllIdentities(kratosAdminUrl);
    } catch (err) {
      this.logger.warn(`[demo-seed] Could not reach Kratos admin API: ${(err as Error).message} — skipping seed.`);
      return;
    }

    let seeded = 0;
    let skipped = 0;

    for (const email of this.DEMO_APP_ADMINS) {
      const identity = identities.find((i) => i.traits?.email === email);
      if (!identity) {
        this.logger.warn(`[demo-seed] Identity not found for ${email} — skipping.`);
        continue;
      }

      try {
        const current = await this.rolesService.getAppRole(identity.id, false);
        if (current === 'app_admin') {
          this.logger.debug(`[demo-seed] ${email} (${identity.id}) already app_admin — no-op.`);
          skipped++;
          continue;
        }

        await this.rolesService.setAppRole(identity.id, 'app_admin');
        this.logger.log(`[demo-seed] Set app_admin for ${email} (${identity.id}).`);
        seeded++;
      } catch (err) {
        this.logger.warn(`[demo-seed] Failed to set app_admin for ${email}: ${(err as Error).message}`);
      }
    }

    this.logger.log(`[demo-seed] Done: ${seeded} seeded, ${skipped} already set.`);
  }

  /**
   * Fetch all Kratos identities with cursor pagination and a per-request timeout.
   *
   * Kratos Admin API supports `?page_size=<n>&page_token=<cursor>`.  We loop
   * until the `Link` header contains no `rel="next"` URL, collecting all pages.
   * Each page request times out after FETCH_TIMEOUT_MS to prevent a hanging seed.
   */
  private async fetchAllIdentities(
    kratosAdminUrl: string,
  ): Promise<Array<{ id: string; traits?: { email?: string } }>> {
    const FETCH_TIMEOUT_MS = 10_000;
    const PER_PAGE = 200;

    const all: Array<{ id: string; traits?: { email?: string } }> = [];
    let pageToken: string | null = null;

    for (;;) {
      const url = new URL(`${kratosAdminUrl}/admin/identities`);
      url.searchParams.set('page_size', String(PER_PAGE));
      if (pageToken) {
        url.searchParams.set('page_token', pageToken);
      }

      const res = await fetch(url.toString(), {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (!res.ok) {
        this.logger.warn(
          `[demo-seed] Kratos admin identities returned HTTP ${res.status} — skipping seed.`,
        );
        return all;
      }

      const page = (await res.json()) as Array<{ id: string; traits?: { email?: string } }>;
      all.push(...page);

      // Kratos signals "more pages" via a `Link: <url>; rel="next"` header.
      const linkHeader = res.headers.get('link') ?? '';
      const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      if (!nextMatch || page.length === 0) {
        break; // Last page.
      }

      // Extract page_token from the next URL.
      const nextUrl = new URL(nextMatch[1]);
      pageToken = nextUrl.searchParams.get('page_token');
      if (!pageToken) {
        break;
      }
    }

    return all;
  }
}
