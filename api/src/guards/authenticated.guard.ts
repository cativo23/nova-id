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
  private readonly publicKey: string;
  private readonly issuer: string;

  constructor(
    private reflector: Reflector,
    private config: ConfigService,
  ) {
    const publicKey = this.config.get<string>('OAUTH_PUBLIC_KEY');
    const issuer = this.config.get<string>('OAUTH_ISSUER');
    if (!publicKey) {
      throw new Error(
        'OAUTH_PUBLIC_KEY is required (no built-in fallback). Set it to the Oathkeeper id_token public key PEM.',
      );
    }
    if (!issuer) {
      throw new Error(
        'OAUTH_ISSUER is required (no built-in fallback). Set it to match the Oathkeeper id_token issuer_url.',
      );
    }
    this.publicKey = publicKey;
    this.issuer = issuer;
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
    const getHeader = (name: string) => {
      const val = headers[name.toLowerCase()] || headers[name];
      return val && val !== '<no value>' ? val : undefined;
    };

    const userId = getHeader('X-User-Id');
    const email = getHeader('X-User-Email');
    const role = getHeader('X-User-Role') || 'platform_user';
    const appRole = getHeader('X-User-App-Role');
    const fullName = getHeader('X-User-Name');

    if (userId) {
      request.user = {
        userId,
        email,
        full_name: fullName,
        role,
        appRole, // App role from OAuth token introspection (if available)
        authMethod: 'header',
      };
      this.logger.log(
        `Authenticated via Oathkeeper headers: ${userId} (${email || 'no email'})`,
      );
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
      const decoded = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
        issuer: this.issuer,
      }) as any;

      const clean = (val: any) => (val && val !== '<no value>' ? val : undefined);
      const fullName = clean(decoded.name ?? decoded.full_name);
      request.user = {
        userId: decoded.sub,
        email: clean(decoded.email),
        full_name: fullName,
        role: clean(decoded.role) || 'platform_user',
        appRole: clean(decoded.appRole),
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
