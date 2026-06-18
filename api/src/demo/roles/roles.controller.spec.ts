import { RolesController } from './roles.controller';

/**
 * RolesController audit-logging spec (Task 1 — M-1).
 *
 * Verifies AuditService.record is called with the correct action and
 * metadata on every mutating handler.
 */

const DEMO_APP_ID = 'nova-id-test-app';

function makeRolesService() {
  return {
    setAppRole: jest.fn().mockResolvedValue({ userId: 'target-u', appRole: 'app_admin' }),
    getAppRole: jest.fn().mockResolvedValue('app_user'),
    getAllUserRoles: jest.fn().mockResolvedValue([]),
    getUserRole: jest.fn().mockResolvedValue(null),
    deleteUserRole: jest.fn().mockResolvedValue(undefined),
  } as any;
}

function makeAudit() {
  return { record: jest.fn().mockResolvedValue(undefined) } as any;
}

const actorUser = {
  userId: 'actor-u1',
  email: 'actor@nova.test',
  role: 'platform_admin',
  authMethod: 'jwt' as const,
  jwtClaims: {},
};

describe('RolesController — audit logging (M-1)', () => {
  describe('bootstrapAppAdmin', () => {
    it('emits membership.grant with actor, target, and role in metadata', async () => {
      const audit = makeAudit();
      const ctrl = new RolesController(makeRolesService(), audit);

      await ctrl.bootstrapAppAdmin(actorUser, { userId: 'target-u' });

      expect(audit.record).toHaveBeenCalledTimes(1);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'actor-u1',
          action: 'membership.grant',
          targetId: 'target-u',
          targetType: 'user',
          appId: DEMO_APP_ID,
          metadata: expect.objectContaining({ appRole: 'app_admin' }),
        }),
      );
    });

    it('uses actor userId as targetId when dto.userId is omitted', async () => {
      const audit = makeAudit();
      const ctrl = new RolesController(makeRolesService(), audit);

      await ctrl.bootstrapAppAdmin(actorUser, {});

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          targetId: 'actor-u1',
        }),
      );
    });
  });

  describe('setUserRole', () => {
    it('emits membership.grant with the role in metadata', async () => {
      const audit = makeAudit();
      const ctrl = new RolesController(makeRolesService(), audit);

      await ctrl.setUserRole('target-u', { appRole: 'app_admin' }, actorUser);

      expect(audit.record).toHaveBeenCalledTimes(1);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'actor-u1',
          action: 'membership.grant',
          targetId: 'target-u',
          targetType: 'user',
          appId: DEMO_APP_ID,
          metadata: expect.objectContaining({ appRole: 'app_admin' }),
        }),
      );
    });
  });

  describe('updateUserRole', () => {
    it('emits membership.grant (role change)', async () => {
      const audit = makeAudit();
      const ctrl = new RolesController(makeRolesService(), audit);

      await ctrl.updateUserRole('target-u', { appRole: 'app_user' }, actorUser);

      expect(audit.record).toHaveBeenCalledTimes(1);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'actor-u1',
          action: 'membership.grant',
          targetId: 'target-u',
          targetType: 'user',
          appId: DEMO_APP_ID,
          metadata: expect.objectContaining({ appRole: 'app_user' }),
        }),
      );
    });
  });

  describe('deleteUserRole', () => {
    it('emits membership.revoke', async () => {
      const audit = makeAudit();
      const ctrl = new RolesController(makeRolesService(), audit);

      await ctrl.deleteUserRole('target-u', actorUser);

      expect(audit.record).toHaveBeenCalledTimes(1);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'actor-u1',
          action: 'membership.revoke',
          targetId: 'target-u',
          targetType: 'user',
          appId: DEMO_APP_ID,
        }),
      );
    });
  });
});
