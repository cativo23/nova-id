import { ForbiddenException } from '@nestjs/common';
import { LogsController } from './logs.controller';

/**
 * Logs controller access-gate spec (ADR-0002 / ADR-0003, strict layering).
 *
 * The SOLE gate for /logs is app role app_admin read from SQLite.
 * platform_admin is an infra-layer role and MUST NOT grant log access —
 * the bypass was removed in this commit.
 */

function makeController(appRoleFromDb: 'app_admin' | 'app_user') {
  const logsService = {
    getAccessLogs: jest.fn().mockReturnValue([]),
    getAccessLogsFiltered: jest.fn().mockReturnValue([]),
    getAccessStats: jest.fn().mockReturnValue({}),
    getAccessLogsByFrontend: jest.fn().mockReturnValue([]),
    getAccessLogsByUser: jest.fn().mockReturnValue([]),
  } as any;

  const rolesService = {
    getAppRole: jest.fn().mockResolvedValue(appRoleFromDb),
  } as any;

  return { controller: new LogsController(logsService, rolesService), rolesService, logsService };
}

function reqWith(user: object) {
  return { user };
}

describe('LogsController access gate (ADR-0002 / ADR-0003)', () => {
  describe('getLogs', () => {
    it('allows a user whose SQLite app role is app_admin', async () => {
      const { controller } = makeController('app_admin');
      const result = await controller.getLogs(reqWith({ userId: 'u-admin' }));
      expect(result).toEqual([]);
    });

    it('denies a user whose SQLite app role is app_user', async () => {
      const { controller } = makeController('app_user');
      await expect(
        controller.getLogs(reqWith({ userId: 'u-user' })),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('denies a platform_admin whose SQLite app role is app_user (bypass removed, ADR-0003)', async () => {
      const { controller, rolesService } = makeController('app_user');
      // role=platform_admin in the JWT/session — must NOT grant access to logs
      await expect(
        controller.getLogs(reqWith({ userId: 'u-padmin', role: 'platform_admin' })),
      ).rejects.toBeInstanceOf(ForbiddenException);
      // confirm SQLite was consulted (not short-circuited)
      expect(rolesService.getAppRole).toHaveBeenCalledWith('u-padmin');
    });
  });

  describe('getStats', () => {
    it('allows app_admin', async () => {
      const { controller } = makeController('app_admin');
      const result = await controller.getStats(reqWith({ userId: 'u-admin' }));
      expect(result).toEqual({});
    });

    it('denies platform_admin with app_user SQLite role', async () => {
      const { controller } = makeController('app_user');
      await expect(
        controller.getStats(reqWith({ userId: 'u-padmin', role: 'platform_admin' })),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('getLogsByFrontend', () => {
    it('allows app_admin', async () => {
      const { controller } = makeController('app_admin');
      const result = await controller.getLogsByFrontend(
        reqWith({ userId: 'u-admin' }),
        'frontend-app',
      );
      expect(result).toEqual([]);
    });

    it('denies platform_admin with app_user SQLite role', async () => {
      const { controller } = makeController('app_user');
      await expect(
        controller.getLogsByFrontend(
          reqWith({ userId: 'u-padmin', role: 'platform_admin' }),
          'frontend-app',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('getLogsByUser', () => {
    it('allows app_admin', async () => {
      const { controller } = makeController('app_admin');
      const result = await controller.getLogsByUser(
        reqWith({ userId: 'u-admin' }),
        'some-user-id',
      );
      expect(result).toEqual([]);
    });

    it('denies platform_admin with app_user SQLite role', async () => {
      const { controller } = makeController('app_user');
      await expect(
        controller.getLogsByUser(
          reqWith({ userId: 'u-padmin', role: 'platform_admin' }),
          'some-user-id',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
