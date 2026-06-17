import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext } from '@nestjs/common';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { AuthenticatedGuard } from './authenticated.guard';

function configStub(values: Record<string, string | undefined>): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}
function reflectorStub(isPublic = false): Reflector {
  return { getAllAndOverride: () => isPublic } as unknown as Reflector;
}
function ctxWithHeaders(headers: Record<string, string>): ExecutionContext {
  const req: any = { headers };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

const ISSUER = 'http://api.local/';
const JWKS_URL = 'http://oathkeeper:4456/.well-known/jwks.json';
const KID = 'test-kid';

// Test keypair that the JWKS endpoint "publishes" (mocked).
const trusted = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const trustedPubPem = trusted.publicKey.export({ type: 'spki', format: 'pem' }) as string;
const trustedPrivPem = trusted.privateKey.export({ type: 'pkcs1', format: 'pem' }) as string;

// A different keypair NOT in the JWKS — tokens signed with it must be rejected.
const attacker = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const attackerPrivPem = attacker.privateKey.export({ type: 'pkcs1', format: 'pem' }) as string;

function sign(claims: Record<string, unknown>, privPem: string, issuer = ISSUER): string {
  return jwt.sign(claims, privPem, {
    algorithm: 'RS256',
    issuer,
    keyid: KID,
  });
}

function fullConfig() {
  return configStub({ OAUTH_JWKS_URL: JWKS_URL, OAUTH_ISSUER: ISSUER });
}

/**
 * The guard resolves the signing key by `kid` via a mockable `getSigningKey`
 * method. We stub it to return only the trusted public key, simulating the
 * JWKS endpoint without any network call.
 */
function newGuardWithJwks(): AuthenticatedGuard {
  const guard = new AuthenticatedGuard(reflectorStub(), fullConfig());
  jest
    .spyOn(guard as any, 'getSigningKey')
    .mockImplementation(async (kid: string) => {
      if (kid !== KID) {
        throw new Error(`Unable to find a signing key that matches kid "${kid}"`);
      }
      return trustedPubPem;
    });
  return guard;
}

describe('AuthenticatedGuard — boot-time contract', () => {
  it('throws when OAUTH_JWKS_URL is missing', () => {
    expect(
      () => new AuthenticatedGuard(reflectorStub(), configStub({ OAUTH_ISSUER: ISSUER })),
    ).toThrow(/OAUTH_JWKS_URL/);
  });

  it('throws when OAUTH_JWKS_URL is empty', () => {
    expect(
      () =>
        new AuthenticatedGuard(
          reflectorStub(),
          configStub({ OAUTH_JWKS_URL: '', OAUTH_ISSUER: ISSUER }),
        ),
    ).toThrow(/OAUTH_JWKS_URL/);
  });

  it('throws when OAUTH_ISSUER is missing', () => {
    expect(
      () => new AuthenticatedGuard(reflectorStub(), configStub({ OAUTH_JWKS_URL: JWKS_URL })),
    ).toThrow(/OAUTH_ISSUER/);
  });

  it('constructs when both are present', () => {
    expect(() => new AuthenticatedGuard(reflectorStub(), fullConfig())).not.toThrow();
  });
});

describe('AuthenticatedGuard — JWKS-verified id_token', () => {
  afterEach(() => jest.restoreAllMocks());

  it('allows public routes without any token', async () => {
    const guard = new AuthenticatedGuard(
      { getAllAndOverride: () => true } as unknown as Reflector,
      fullConfig(),
    );
    await expect(guard.canActivate(ctxWithHeaders({}))).resolves.toBe(true);
  });

  it('accepts a JWT signed by the JWKS key with the correct issuer and populates request.user', async () => {
    const guard = newGuardWithJwks();
    const token = sign(
      { sub: 'real-uuid', email: 'u@example.com', name: 'Real User', role: 'platform_admin' },
      trustedPrivPem,
    );
    const ctx = ctxWithHeaders({ authorization: `Bearer ${token}` });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);

    const req = ctx.switchToHttp().getRequest();
    expect(req.user.userId).toBe('real-uuid');
    expect(req.user.email).toBe('u@example.com');
    expect(req.user.full_name).toBe('Real User');
    expect(req.user.role).toBe('platform_admin');
  });

  it('defaults role to platform_user when the role claim is empty', async () => {
    const guard = newGuardWithJwks();
    const token = sign({ sub: 'u2', email: 'x@y.z', role: '' }, trustedPrivPem);
    const ctx = ctxWithHeaders({ authorization: `Bearer ${token}` });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(ctx.switchToHttp().getRequest().user.role).toBe('platform_user');
  });

  it('rejects a JWT with the wrong issuer', async () => {
    const guard = newGuardWithJwks();
    const token = sign({ sub: 'u', role: 'platform_user' }, trustedPrivPem, 'https://evil.example/');
    const ctx = ctxWithHeaders({ authorization: `Bearer ${token}` });
    await expect(guard.canActivate(ctx)).rejects.toThrow();
  });

  it('rejects a request with no Bearer token', async () => {
    const guard = newGuardWithJwks();
    await expect(guard.canActivate(ctxWithHeaders({}))).rejects.toThrow();
  });

  it('rejects an X-User-* header without a token (no header-auth branch anymore)', async () => {
    const guard = newGuardWithJwks();
    const ctx = ctxWithHeaders({ 'x-user-id': 'attacker-uuid', 'x-user-role': 'platform_admin' });
    await expect(guard.canActivate(ctx)).rejects.toThrow();
  });

  it('rejects a JWT signed by a key that is not in the JWKS', async () => {
    const guard = newGuardWithJwks();
    const token = sign({ sub: 'u', role: 'platform_admin' }, attackerPrivPem);
    const ctx = ctxWithHeaders({ authorization: `Bearer ${token}` });
    await expect(guard.canActivate(ctx)).rejects.toThrow();
  });

  it('rejects a valid JWT that has no sub claim (empty string)', async () => {
    const guard = newGuardWithJwks();
    // jwt.sign with sub='' still produces a valid signed token; the guard must
    // reject it because an empty subject is not a valid principal.
    const token = sign({ sub: '', email: 'u@example.com', role: 'platform_user' }, trustedPrivPem);
    const ctx = ctxWithHeaders({ authorization: `Bearer ${token}` });
    await expect(guard.canActivate(ctx)).rejects.toThrow(/subject/i);
  });

  it('rejects a valid JWT that has no sub claim (omitted)', async () => {
    const guard = newGuardWithJwks();
    // Explicitly omit sub by not including it in the claims.
    const token = jwt.sign(
      { email: 'u@example.com', role: 'platform_user' },
      trustedPrivPem,
      { algorithm: 'RS256', issuer: ISSUER, keyid: KID },
    );
    const ctx = ctxWithHeaders({ authorization: `Bearer ${token}` });
    await expect(guard.canActivate(ctx)).rejects.toThrow();
  });
});
