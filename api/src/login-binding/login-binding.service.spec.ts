import { ForbiddenException } from '@nestjs/common';
import { LoginBindingService } from './login-binding.service';

function makeRepo() {
  return {
    findOne: jest.fn(),
    create: jest.fn((x: unknown) => x),
    save: jest.fn().mockResolvedValue(undefined),
  };
}

describe('LoginBindingService.register', () => {
  it('inserts a new binding when the challenge is unclaimed', async () => {
    const repo = makeRepo();
    repo.findOne.mockResolvedValue(null);
    const svc = new LoginBindingService(repo as any);

    await svc.register('u1', 'chal');

    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(repo.create).toHaveBeenCalledWith({ userId: 'u1', loginChallenge: 'chal' });
  });

  it('is idempotent: re-registering the same challenge for the SAME user does not insert again', async () => {
    const repo = makeRepo();
    repo.findOne.mockResolvedValue({ userId: 'u1', loginChallenge: 'chal', createdAt: new Date() });
    const svc = new LoginBindingService(repo as any);

    await svc.register('u1', 'chal');

    expect(repo.save).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when the challenge is already claimed by a different identity', async () => {
    const repo = makeRepo();
    repo.findOne.mockResolvedValue({ userId: 'other', loginChallenge: 'chal', createdAt: new Date() });
    const svc = new LoginBindingService(repo as any);

    await expect(svc.register('u1', 'chal')).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('race: a concurrent UNIQUE violation won by the same user resolves to a no-op', async () => {
    const repo = makeRepo();
    // First lookup: unclaimed. Insert then loses the race with a 23505.
    repo.findOne.mockResolvedValueOnce(null);
    const uniqueErr = Object.assign(new Error('duplicate key'), { code: '23505' });
    repo.save.mockRejectedValueOnce(uniqueErr);
    // Re-fetch after the violation: WE (our own retry) are the winner.
    repo.findOne.mockResolvedValueOnce({ userId: 'u1', loginChallenge: 'chal', createdAt: new Date() });
    const svc = new LoginBindingService(repo as any);

    await expect(svc.register('u1', 'chal')).resolves.toBeUndefined();
  });

  it('race: a concurrent UNIQUE violation won by someone else throws ForbiddenException', async () => {
    const repo = makeRepo();
    repo.findOne.mockResolvedValueOnce(null);
    const uniqueErr = Object.assign(new Error('duplicate key'), { code: '23505' });
    repo.save.mockRejectedValueOnce(uniqueErr);
    repo.findOne.mockResolvedValueOnce({ userId: 'attacker', loginChallenge: 'chal', createdAt: new Date() });
    const svc = new LoginBindingService(repo as any);

    await expect(svc.register('u1', 'chal')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('re-throws non-unique-violation errors unchanged', async () => {
    const repo = makeRepo();
    repo.findOne.mockResolvedValue(null);
    repo.save.mockRejectedValueOnce(new Error('connection reset'));
    const svc = new LoginBindingService(repo as any);

    await expect(svc.register('u1', 'chal')).rejects.toThrow('connection reset');
  });
});

describe('LoginBindingService.isBoundTo', () => {
  it('returns false when no binding exists', async () => {
    const repo = makeRepo();
    repo.findOne.mockResolvedValue(null);
    const svc = new LoginBindingService(repo as any);

    expect(await svc.isBoundTo('u1', 'chal')).toBe(false);
  });

  it('returns true for a fresh binding owned by the user', async () => {
    const repo = makeRepo();
    repo.findOne.mockResolvedValue({ userId: 'u1', loginChallenge: 'chal', createdAt: new Date() });
    const svc = new LoginBindingService(repo as any);

    expect(await svc.isBoundTo('u1', 'chal')).toBe(true);
  });

  it('returns false when the binding is owned by a different user', async () => {
    const repo = makeRepo();
    repo.findOne.mockResolvedValue({ userId: 'other', loginChallenge: 'chal', createdAt: new Date() });
    const svc = new LoginBindingService(repo as any);

    expect(await svc.isBoundTo('u1', 'chal')).toBe(false);
  });

  it('returns false for an expired binding even if owned by the user', async () => {
    const repo = makeRepo();
    const stale = new Date(Date.now() - LoginBindingService.TTL_MS - 1000);
    repo.findOne.mockResolvedValue({ userId: 'u1', loginChallenge: 'chal', createdAt: stale });
    const svc = new LoginBindingService(repo as any);

    expect(await svc.isBoundTo('u1', 'chal')).toBe(false);
  });
});
