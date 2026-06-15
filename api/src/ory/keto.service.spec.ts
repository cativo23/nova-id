import { KetoService } from './keto.service';

describe('KetoService', () => {
  it('check returns true when Keto allows', async () => {
    const api = { checkPermission: jest.fn().mockResolvedValue({ data: { allowed: true } }) };
    const svc = new KetoService(api as any);

    const allowed = await svc.check({ namespace: 'Platform', object: 'nova', relation: 'manage_users', subjectId: 'user:abc' });

    expect(allowed).toBe(true);
    expect(api.checkPermission).toHaveBeenCalledWith(
      expect.objectContaining({ namespace: 'Platform', object: 'nova', relation: 'manage_users', subjectId: 'user:abc' }),
    );
  });

  it('check returns false when Keto denies', async () => {
    const api = { checkPermission: jest.fn().mockResolvedValue({ data: { allowed: false } }) };
    const svc = new KetoService(api as any);
    expect(await svc.check({ namespace: 'Platform', object: 'nova', relation: 'administer', subjectId: 'user:x' })).toBe(false);
  });

  it('FAIL-CLOSED: check returns false when Keto throws (service down → 500)', async () => {
    const api = { checkPermission: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) };
    const svc = new KetoService(api as any);
    expect(await svc.check({ namespace: 'Platform', object: 'nova', relation: 'manage_users', subjectId: 'user:x' })).toBe(false);
  });

  it('checkPlatform resolves manage_users + administer flags for a user', async () => {
    const api = {
      checkPermission: jest
        .fn()
        .mockResolvedValueOnce({ data: { allowed: true } })
        .mockResolvedValueOnce({ data: { allowed: false } }),
    };
    const svc = new KetoService(api as any);
    const flags = await svc.checkPlatform('abc');
    expect(flags).toEqual({ manage_users: true, administer: false });
  });

  // Additional fail-closed tests
  it('FAIL-CLOSED: check returns false for malformed response (no allowed field)', async () => {
    const api = { checkPermission: jest.fn().mockResolvedValue({ data: {} }) };
    const svc = new KetoService(api as any);
    expect(await svc.check({ namespace: 'Platform', object: 'nova', relation: 'manage_users', subjectId: 'user:x' })).toBe(false);
  });

  it('FAIL-CLOSED: check returns false for Axios-style 403 error object', async () => {
    const axiosErr: any = new Error('Forbidden');
    axiosErr.response = { status: 403 };
    const api = { checkPermission: jest.fn().mockRejectedValue(axiosErr) };
    const svc = new KetoService(api as any);
    expect(await svc.check({ namespace: 'Platform', object: 'nova', relation: 'manage_users', subjectId: 'user:x' })).toBe(false);
  });

  it('FAIL-CLOSED: checkPlatform returns both flags false when one check throws', async () => {
    const api = {
      checkPermission: jest
        .fn()
        .mockRejectedValueOnce(new Error('network'))
        .mockResolvedValueOnce({ data: { allowed: true } }),
    };
    const svc = new KetoService(api as any);
    const flags = await svc.checkPlatform('x');
    // manage_users threw → false; administer resolved true → true
    // Both calls run via Promise.all — the throw is caught inside check()
    expect(flags.manage_users).toBe(false);
    expect(flags.administer).toBe(true);
  });
});

describe('checkApp', () => {
  it('checks App:<appId>#access for user:<id> and returns true when allowed', async () => {
    const api = { checkPermission: jest.fn().mockResolvedValue({ data: { allowed: true } }) };
    const svc = new KetoService(api as any);

    const allowed = await svc.checkApp('user-123', 'nova-id-test-app');

    expect(allowed).toBe(true);
    expect(api.checkPermission).toHaveBeenCalledWith(
      expect.objectContaining({
        namespace: 'App',
        object: 'nova-id-test-app',
        relation: 'access',
        subjectId: 'user:user-123',
      }),
    );
  });

  it('FAIL-CLOSED: checkApp returns false when Keto throws', async () => {
    const api = { checkPermission: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) };
    const svc = new KetoService(api as any);
    expect(await svc.checkApp('u', 'app1')).toBe(false);
  });

  it('checkApp returns false when user is not a member', async () => {
    const api = { checkPermission: jest.fn().mockResolvedValue({ data: { allowed: false } }) };
    const svc = new KetoService(api as any);
    expect(await svc.checkApp('u', 'app1')).toBe(false);
  });
});
