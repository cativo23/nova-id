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
 * DemoAuthenticatedGuard — ZERO TRUST with Oathkeeper (Ory IAP pattern).
 *
 * Mirrors the IdP AuthenticatedGuard but is demo-api's own copy so demo-api
 * has no runtime import from api/ (ADR-0001 extraction cost, accepted).
 *
 * Oathkeeper mints a signed RS256 id_token (JWT) for authenticated requests
 * via its `id_token` mutator. The JWT is delivered as `Authorization: Bearer
 * <jwt>`. demo-api verifies it against the Oathkeeper JWKS endpoint
 * (JWKS_URL, typically http://oathkeeper:4456/.well-known/jwks.json on the
 * apps Docker network) and checks the issuer matches OAUTH_ISSUER.
 *
 * demo-api is on the `apps` network ONLY — it must NOT be on ory-internal.
 * Oathkeeper is on both apps and ory-internal, so http://oathkeeper:4456 is
 * reachable from demo-api over apps.
 */
@Injectable()
export class DemoAuthenticatedGuard implements CanActivate {
  private readonly logger = new Logger(DemoAuthenticatedGuard.name);
  private readonly issuer: string;
  private readonly jwksUri: string;
  private readonly jwksClient: JwksClient;

  constructor(
    private reflector: Reflector,
    private config: ConfigService,
  ) {
    const jwksUri = this.config.get<string>('JWKS_URL');
    const issuer = this.config.get<string>('OAUTH_ISSUER');
    if (!jwksUri) {
      throw new Error(
        "JWKS_URL is required. Set it to Oathkeeper's JWKS endpoint, e.g. http://oathkeeper:4456/.well-known/jwks.json.",
      );
    }
    if (!issuer) {
      throw new Error(
        'OAUTH_ISSUER is required. Set it to the Oathkeeper id_token issuer_url (https://id.cativo.dev/).',
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
        'Unauthorized. Provide a valid token from Oathkeeper.',
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

      if (!decoded.sub) {
        throw new UnauthorizedException('Token missing subject claim');
      }
      const clean = (val: unknown) =>
        val && val !== '<no value>' ? (val as string) : undefined;
      request.user = {
        userId: decoded.sub,
        email: clean(decoded.email),
        full_name: clean(decoded.name ?? decoded.full_name),
        role: clean(decoded.role) || 'platform_user',
        authMethod: 'jwt',
        jwtClaims: decoded,
      };
      this.logger.debug(
        `Authenticated via Oathkeeper id_token: ${decoded.sub} (${decoded.email || 'no email'})`,
      );
      return true;
    } catch (error: any) {
      if (error instanceof UnauthorizedException) {
        this.logger.error(`JWT validation failed: ${error.message}`);
        throw error;
      }
      this.logger.error(`JWT validation failed: ${error?.message ?? error}`);
      throw new UnauthorizedException('Invalid token');
    }
  }

  private decodeKid(token: string): string {
    const decoded = jwt.decode(token, { complete: true });
    const kid = decoded?.header?.kid;
    if (!kid) {
      throw new Error('Token header has no "kid"');
    }
    return kid;
  }

  protected async getSigningKey(kid: string): Promise<string> {
    const key = await this.jwksClient.getSigningKey(kid);
    return key.getPublicKey();
  }
}
