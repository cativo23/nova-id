import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PlatformAdministerGuard } from './platform-administer.guard';

function ctx(user: any): ExecutionContext {
  return { switchToHttp: () => ({ getRequest: () => ({ user }) }) } as any;
}

describe('PlatformAdministerGuard', () => {
  it('allows when KetoService.check(administer) is true', async () => {
    const keto = { check: jest.fn().mockResolvedValue(true) };
    const guard = new PlatformAdministerGuard(keto as any);
    await expect(guard.canActivate(ctx({ userId: 'abc' }))).resolves.toBe(true);
    expect(keto.check).toHaveBeenCalledWith(
      expect.objectContaining({ namespace: 'Platform', object: 'nova', relation: 'administer', subjectId: 'user:abc' }),
    );
  });

  it('denies (Forbidden) when Keto check is false', async () => {
    const keto = { check: jest.fn().mockResolvedValue(false) };
    const guard = new PlatformAdministerGuard(keto as any);
    await expect(guard.canActivate(ctx({ userId: 'abc' }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws UnauthorizedException (not Forbidden) when there is no authenticated user', async () => {
    const keto = { check: jest.fn() };
    const guard = new PlatformAdministerGuard(keto as any);
    await expect(guard.canActivate(ctx(undefined))).rejects.toBeInstanceOf(UnauthorizedException);
    expect(keto.check).not.toHaveBeenCalled();
  });
});
