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
});
