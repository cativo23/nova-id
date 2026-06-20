import { UnauthorizedException } from '@nestjs/common';
import { DemoAuthenticatedGuard } from './demo-authenticated.guard';

/**
 * DemoAuthenticatedGuard unit tests.
 *
 * Verifies JWKS-based JWT verification, Public bypass, and all rejection paths.
 * getSigningKey is stubbed so no network calls are made.
 */

function makeConfig(overrides: Record<string, string> = {}) {
  const defaults = {
    JWKS_URL: 'http://oathkeeper:4456/.well-known/jwks.json',
    OAUTH_ISSUER: 'https://id.cativo.dev/',
    ...overrides,
  };
  return { get: (key: string) => defaults[key] } as any;
}

function makeReflector(isPublic: boolean) {
  return { getAllAndOverride: jest.fn().mockReturnValue(isPublic) } as any;
}

function makeGuard(overrides: Record<string, string> = {}) {
  const guard = new DemoAuthenticatedGuard(makeReflector(false), makeConfig(overrides));
  return guard;
}

describe('DemoAuthenticatedGuard', () => {
  it('throws at construction when JWKS_URL is missing', () => {
    expect(
      () => new DemoAuthenticatedGuard(makeReflector(false), makeConfig({ JWKS_URL: '' })),
    ).toThrow('JWKS_URL is required');
  });

  it('throws at construction when OAUTH_ISSUER is missing', () => {
    expect(
      () => new DemoAuthenticatedGuard(makeReflector(false), makeConfig({ OAUTH_ISSUER: '' })),
    ).toThrow('OAUTH_ISSUER is required');
  });

  it('bypasses verification for @Public endpoints', async () => {
    const guard = new DemoAuthenticatedGuard(makeReflector(true), makeConfig());
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('rejects requests with no Authorization header', async () => {
    const guard = makeGuard();
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects requests with non-Bearer Authorization header', async () => {
    const guard = makeGuard();
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization: 'Basic dXNlcjpwYXNz' } }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('sets request.user from verified JWT claims', async () => {
    const jwtLib = require('jsonwebtoken');
    const payload = {
      sub: 'user-abc',
      email: 'alice@nova.test',
      name: 'Alice',
      role: 'platform_admin',
      iss: 'https://id.cativo.dev/',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const token = jwtLib.sign(payload, 'test-secret', { header: { kid: 'test-kid' } });

    const guard = makeGuard();
    jest.spyOn(guard as any, 'getSigningKey').mockResolvedValue('fake-key');
    jest.spyOn(jwtLib, 'verify').mockReturnValue(payload as any);

    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(req.user.userId).toBe('user-abc');
    expect(req.user.email).toBe('alice@nova.test');
    expect(req.user.role).toBe('platform_admin');
    expect(req.user.authMethod).toBe('jwt');

    jest.restoreAllMocks();
  });

  it('rejects a token missing the sub claim', async () => {
    const jwtLib = require('jsonwebtoken');
    const payload = {
      email: 'nosubject@nova.test',
      iss: 'https://id.cativo.dev/',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = jwtLib.sign(payload, 'test-secret', { header: { kid: 'test-kid' } });

    const guard = makeGuard();
    jest.spyOn(guard as any, 'getSigningKey').mockResolvedValue('fake-key');
    jest.spyOn(jwtLib, 'verify').mockReturnValue(payload as any);

    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    jest.restoreAllMocks();
  });
});
