import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PlatformManageUsersGuard } from './platform-manage-users.guard';

function ctx(user: any): ExecutionContext {
  return { switchToHttp: () => ({ getRequest: () => ({ user }) }) } as any;
}

describe('PlatformManageUsersGuard', () => {
  it('allows when KetoService.check(manage_users) is true', async () => {
    const keto = { check: jest.fn().mockResolvedValue(true) };
    const guard = new PlatformManageUsersGuard(keto as any);
    await expect(guard.canActivate(ctx({ userId: 'abc' }))).resolves.toBe(true);
    expect(keto.check).toHaveBeenCalledWith(
      expect.objectContaining({ namespace: 'Platform', object: 'nova', relation: 'manage_users', subjectId: 'user:abc' }),
    );
  });

  it('denies (Forbidden) when Keto check is false', async () => {
    const keto = { check: jest.fn().mockResolvedValue(false) };
    const guard = new PlatformManageUsersGuard(keto as any);
    await expect(guard.canActivate(ctx({ userId: 'abc' }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws UnauthorizedException (not Forbidden) when there is no authenticated user', async () => {
    const keto = { check: jest.fn() };
    const guard = new PlatformManageUsersGuard(keto as any);
    await expect(guard.canActivate(ctx(undefined))).rejects.toBeInstanceOf(UnauthorizedException);
    expect(keto.check).not.toHaveBeenCalled();
  });
});
