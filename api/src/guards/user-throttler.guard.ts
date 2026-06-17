import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * UserThrottlerGuard — gateway-aware rate limiter.
 *
 * The BFF runs behind the Oathkeeper gateway, so the raw socket IP is always
 * the gateway's IP — keying by IP would merge all clients into one bucket.
 *
 * Instead, key by the authenticated user id (populated on request.user.userId
 * by AuthenticatedGuard from the JWKS-verified id_token). This gives each
 * principal an independent 100 req/60 s bucket.
 *
 * Fallback to IP for unauthenticated/public routes (health check, etc.).
 * Behind the gateway the fallback IP is the gateway IP — acceptable for the
 * handful of public routes that bypass AuthenticatedGuard.
 *
 * Guard ordering: AuthenticatedGuard is registered first (APP_GUARD in
 * AuthModule, imported before AppModule's own providers), so request.user is
 * always set before getTracker() is called on authenticated routes.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const userId = req?.user?.userId;
    if (userId) return `user:${userId}`;
    // Public/unauthenticated routes: fall back to IP. Behind the gateway this
    // resolves to the gateway's IP — tolerable for the few public endpoints.
    const ip = req?.ips?.length ? req.ips[0] : req?.ip;
    return `ip:${ip ?? 'unknown'}`;
  }
}
