import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedGuard } from './authenticated.guard';

function configStub(values: Record<string, string | undefined>): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}
function reflectorStub(isPublic = false): Reflector {
  return { getAllAndOverride: () => isPublic } as unknown as Reflector;
}

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
  it('constructs when both are present', () => {
    const config = configStub({
      OAUTH_PUBLIC_KEY: '-----BEGIN PUBLIC KEY-----\nx\n-----END PUBLIC KEY-----',
      OAUTH_ISSUER: 'http://api.local/',
    });
    expect(() => new AuthenticatedGuard(reflectorStub(), config)).not.toThrow();
  });
});
