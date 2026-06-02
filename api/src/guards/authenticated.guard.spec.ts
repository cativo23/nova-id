import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext } from '@nestjs/common';
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

const VALID_PEM = '-----BEGIN PUBLIC KEY-----\nx\n-----END PUBLIC KEY-----';

describe('AuthenticatedGuard — boot-time key/issuer contract', () => {
  it('throws when OAUTH_PUBLIC_KEY is missing (no hardcoded fallback)', () => {
    const config = configStub({ OAUTH_ISSUER: 'http://api.local/' });
    expect(() => new AuthenticatedGuard(reflectorStub(), config)).toThrow(/OAUTH_PUBLIC_KEY/);
  });
  it('throws when OAUTH_PUBLIC_KEY is empty string', () => {
    expect(() => new AuthenticatedGuard(reflectorStub(),
      configStub({ OAUTH_PUBLIC_KEY: '', OAUTH_ISSUER: 'http://api.local/' }))).toThrow(/OAUTH_PUBLIC_KEY/);
  });
  it('throws when OAUTH_ISSUER is missing (no hardcoded fallback)', () => {
    const config = configStub({ OAUTH_PUBLIC_KEY: '-----BEGIN PUBLIC KEY-----\nx\n-----END PUBLIC KEY-----' });
    expect(() => new AuthenticatedGuard(reflectorStub(), config)).toThrow(/OAUTH_ISSUER/);
  });
  it('throws when GATEWAY_SHARED_SECRET is missing (no header auth without provenance)', () => {
    const config = configStub({
      OAUTH_PUBLIC_KEY: VALID_PEM,
      OAUTH_ISSUER: 'http://api.local/',
    });
    expect(() => new AuthenticatedGuard(reflectorStub(), config)).toThrow(
      /GATEWAY_SHARED_SECRET/,
    );
  });
  it('constructs when all three are present', () => {
    const config = configStub({
      OAUTH_PUBLIC_KEY: VALID_PEM,
      OAUTH_ISSUER: 'http://api.local/',
      GATEWAY_SHARED_SECRET: 'x',
    });
    expect(() => new AuthenticatedGuard(reflectorStub(), config)).not.toThrow();
  });
});

describe('AuthenticatedGuard — gateway shared-secret on header auth', () => {
  const config = configStub({
    OAUTH_PUBLIC_KEY: VALID_PEM,
    OAUTH_ISSUER: 'http://api.local/',
    GATEWAY_SHARED_SECRET: 'top-secret',
  });

  it('rejects forged X-User-Id without the gateway secret', async () => {
    const guard = new AuthenticatedGuard(reflectorStub(), config);
    const ctx = ctxWithHeaders({ 'x-user-id': 'attacker-uuid' });
    await expect(guard.canActivate(ctx)).rejects.toThrow();
  });

  it('rejects forged X-User-Id with a wrong gateway secret', async () => {
    const guard = new AuthenticatedGuard(reflectorStub(), config);
    const ctx = ctxWithHeaders({ 'x-user-id': 'attacker-uuid', 'x-gateway-auth': 'wrong' });
    await expect(guard.canActivate(ctx)).rejects.toThrow();
  });

  it('accepts header auth when the gateway secret matches', async () => {
    const guard = new AuthenticatedGuard(reflectorStub(), config);
    const ctx = ctxWithHeaders({
      'x-user-id': 'real-uuid',
      'x-user-email': 'u@example.com',
      'x-gateway-auth': 'top-secret',
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('with a valid gateway secret but no X-User-Id, falls through to JWT (rejects without a Bearer token)', async () => {
    const guard = new AuthenticatedGuard(reflectorStub(), config);
    const ctx = ctxWithHeaders({ 'x-gateway-auth': 'top-secret' });
    await expect(guard.canActivate(ctx)).rejects.toThrow();
  });
});
