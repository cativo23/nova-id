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

/** Default Oathkeeper id_token JWKS public key (local dev only); production must set OAUTH_PUBLIC_KEY. */
const DEFAULT_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA5l5yXVUlH9vphJactgCR
8sOPiDIhz66KBatfjFAVuz-sahRZVGLTJsXEBlxVLkOvL186P-lVK9EuW-2Ozs6u
SbZiy7TYu686IASXU0XZ7OmWjaHk1KTZGM26Mo1RlU8lJlLaYqcTevFn2bHOWnDP
DEl274ptM4oy1m7w5FJYnfV4Ob2bp9ZRFmFxBK6ggXVDMQ9jFn-lVHBrFiXlARKw
qJIeJknrXfNB3qShkKXqOzqDPKl4HbNetvC6P6-wJU9ugy2q9i55OfJW1FRfINPr
XukloZUJT0TyoUJPtwfOUS_O-FjQBX6Dgw_p4LJf9pM_Y8hBlaAdET7eHohmuCgp
XQIDAQAB
-----END PUBLIC KEY-----`;

/**
 * AuthenticatedGuard - ZERO TRUST with Oathkeeper
 *
 * Supports two auth modes (API is only reachable via Oathkeeper):
 * 1. Header-based: Oathkeeper validates Kratos session, injects X-User-ID, X-User-Email, X-User-Role.
 *    Used for /api/protected, /api/me, etc. (no JWT, no Hydra).
 * 2. JWT-based: Bearer token from Oathkeeper id_token mutator (e.g. when using Hydra OAuth2).
 *    Validate with Oathkeeper JWKS and use claims. Issuer and public key from OAUTH_ISSUER and OAUTH_PUBLIC_KEY.
 */
@Injectable()
export class AuthenticatedGuard implements CanActivate {
  private readonly logger = new Logger(AuthenticatedGuard.name);

  constructor(
    private reflector: Reflector,
    private config: ConfigService,
  ) { }

  private getJwtPublicKey(): string {
    return this.config.get<string>('OAUTH_PUBLIC_KEY') || DEFAULT_PUBLIC_KEY;
  }

  private getJwtIssuer(): string {
    return this.config.get<string>('OAUTH_ISSUER') || 'http://localhost:4455/';
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
    const headers = request.headers;

    // 1. Header-based auth: Oathkeeper injects these after validating Kratos session (cookie) or OAuth token.
    const userId = headers['x-user-id'] || headers['X-User-ID'];
    const email = headers['x-user-email'] || headers['X-User-Email'];
    const role = headers['x-user-role'] || headers['X-User-Role'] || 'platform_user';
    const appRole = headers['x-user-app-role'] || headers['X-User-App-Role'];
    const fullName = headers['x-user-name'] || headers['X-User-Name'];

    if (userId) {
      request.user = {
        userId,
        email: email || undefined,
        full_name: fullName || undefined,
        role,
        appRole: appRole || undefined, // App role from OAuth token introspection (if available)
        authMethod: 'header',
      };
      this.logger.log(`Authenticated via Oathkeeper headers: ${userId} (${email || 'no email'})`);
      return true;
    }

    // 2. JWT-based auth: Bearer token (e.g. from Hydra OAuth2 or id_token mutator).
    const authHeader = headers['authorization'] || headers['Authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.warn('Missing X-User-ID and Bearer token - request not authenticated');
      throw new UnauthorizedException(
        'Unauthorized. Log in via the auth UI, or provide a valid JWT from Oathkeeper.',
      );
    }

    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, this.getJwtPublicKey(), {
        algorithms: ['RS256'],
        issuer: this.getJwtIssuer(),
      }) as any;

      const fullName = decoded.name ?? decoded.full_name;
      request.user = {
        userId: decoded.sub,
        email: decoded.email,
        full_name: fullName || undefined,
        role: decoded.role || 'platform_user',
        appRole: decoded.appRole || undefined,
        authMethod: 'jwt',
        jwtClaims: decoded,
      };
      this.logger.debug(`Authenticated via JWT: ${decoded.sub} (${decoded.email || 'no email'})`);
      return true;
    } catch (error: any) {
      this.logger.error(`JWT validation failed:`, error.message);
      throw new UnauthorizedException('Invalid JWT token');
    }
  }
}
