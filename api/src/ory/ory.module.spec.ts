import { MODULE_METADATA } from '@nestjs/common/constants';
import { OryModule } from './ory.module';
import { KRATOS_IDENTITY_API, KETO_PERMISSION_API, HYDRA_OAUTH2_API } from './ory.constants';

function getProvider(token: unknown) {
  const providers: any[] = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, OryModule);
  return providers.find((p) => p.provide === token);
}

function fakeConfig(overrides: Record<string, string> = {}) {
  const values: Record<string, string> = {
    KRATOS_ADMIN_URL: 'http://kratos.local',
    KETO_READ_URL: 'http://keto.local',
    HYDRA_ADMIN_URL: 'http://hydra.local',
    ...overrides,
  };
  return {
    getOrThrow: (key: string) => {
      if (!(key in values)) throw new Error(`missing ${key}`);
      return values[key];
    },
    get: (key: string, def?: unknown) => values[key] ?? def,
  };
}

describe('OryModule Ory SDK client timeouts', () => {
  it('gives the Kratos IdentityApi client a bounded request timeout', () => {
    const provider = getProvider(KRATOS_IDENTITY_API);
    const client = provider.useFactory(fakeConfig());
    expect((client as any).configuration.baseOptions?.timeout).toBeGreaterThan(0);
  });

  it('gives the Keto PermissionApi client a bounded request timeout', () => {
    const provider = getProvider(KETO_PERMISSION_API);
    const client = provider.useFactory(fakeConfig());
    expect((client as any).configuration.baseOptions?.timeout).toBeGreaterThan(0);
  });

  it('gives the Hydra OAuth2Api client a bounded request timeout', () => {
    const provider = getProvider(HYDRA_OAUTH2_API);
    const client = provider.useFactory(fakeConfig());
    expect((client as any).configuration.baseOptions?.timeout).toBeGreaterThan(0);
  });

  it('is overridable via ORY_HTTP_TIMEOUT_MS', () => {
    const provider = getProvider(HYDRA_OAUTH2_API);
    const client = provider.useFactory(fakeConfig({ ORY_HTTP_TIMEOUT_MS: '9999' }));
    expect((client as any).configuration.baseOptions?.timeout).toBe(9999);
  });
});
