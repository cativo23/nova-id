import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import * as jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';

/**
 * AuthenticatedGuard — ZERO TRUST with Oathkeeper (Ory IAP pattern).
 *
 * The API is only reachable through Oathkeeper, which mints a signed RS256
 * id_token (JWT) for authenticated requests and publishes its public key at
 * the JWKS endpoint (OAUTH_JWKS_URL). The guard verifies every request's
 * `Authorization: Bearer <jwt>` against that JWKS (RS256 + issuer check) and
 * derives identity from the verified claims.
 *
 * There is no header-trust path: a forged `X-User-*` header alone never
 * authenticates, because identity comes from the cryptographically verified
 * token, not from headers Oathkeeper happens to inject.
 */
@Injectable()
export class AuthenticatedGuard implements CanActivate {
  private readonly logger = new Logger(AuthenticatedGuard.name);
  private readonly issuer: string;
  private readonly jwksUri: string;
  private readonly jwksClient: JwksClient;

  constructor(
    private reflector: Reflector,
    private config: ConfigService,
  ) {
    const jwksUri = this.config.get<string>('OAUTH_JWKS_URL');
    const issuer = this.config.get<string>('OAUTH_ISSUER');
    if (!jwksUri) {
      throw new Error(
        'OAUTH_JWKS_URL is required (no built-in fallback). Set it to Oathkeeper’s JWKS endpoint, e.g. http://oathkeeper:4456/.well-known/jwks.json.',
      );
    }
    if (!issuer) {
      throw new Error(
        'OAUTH_ISSUER is required (no built-in fallback). Set it to match the Oathkeeper id_token issuer_url.',
      );
    }
    this.jwksUri = jwksUri;
    this.issuer = issuer;
    this.jwksClient = new JwksClient({
      jwksUri,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 10 * 60 * 1000, // 10 minutes
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const headers = request.headers ?? {};
    const authHeader: string | undefined =
      headers['authorization'] || headers['Authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.warn('Missing Bearer token — request not authenticated');
      throw new UnauthorizedException(
        'Unauthorized. Log in via the auth UI, or provide a valid token from Oathkeeper.',
      );
    }

    const token = authHeader.substring(7);
    try {
      const kid = this.decodeKid(token);
      const signingKey = await this.getSigningKey(kid);
      const decoded = jwt.verify(token, signingKey, {
        algorithms: ['RS256'],
        issuer: this.issuer,
      }) as jwt.JwtPayload;

      const clean = (val: unknown) =>
        val && val !== '<no value>' ? (val as string) : undefined;
      request.user = {
        userId: decoded.sub,
        email: clean(decoded.email),
        full_name: clean(decoded.name ?? decoded.full_name),
        role: clean(decoded.role) || 'platform_user',
        appRole: clean(decoded.appRole),
        authMethod: 'jwt',
        jwtClaims: decoded,
      };
      this.logger.debug(
        `Authenticated via Oathkeeper id_token: ${decoded.sub} (${decoded.email || 'no email'})`,
      );
      return true;
    } catch (error: any) {
      this.logger.error(`JWT validation failed: ${error?.message ?? error}`);
      throw new UnauthorizedException('Invalid token');
    }
  }

  /** Extract the `kid` from the token header without verifying the signature. */
  private decodeKid(token: string): string {
    const decoded = jwt.decode(token, { complete: true });
    const kid = decoded?.header?.kid;
    if (!kid) {
      throw new Error('Token header has no "kid"');
    }
    return kid;
  }

  /**
   * Resolve the RS256 public key for the given `kid` from the JWKS endpoint.
   * Extracted so unit tests can stub key resolution without a network call.
   */
  protected async getSigningKey(kid: string): Promise<string> {
    const key = await this.jwksClient.getSigningKey(kid);
    return key.getPublicKey();
  }
}
