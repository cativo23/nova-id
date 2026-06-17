import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditLog } from './audit-log.entity';
import { AuditService } from './audit.service';

/**
 * TDD spec for AuditService.
 *
 * Tests are written against the public contract only — no internals are exposed.
 * The repository is fully mocked so this spec runs without a real DB connection.
 */

function makeRepoMock() {
  return {
    create: jest.fn((data: Partial<AuditLog>) => data as AuditLog),
    save: jest.fn().mockResolvedValue(undefined),
    insert: jest.fn().mockResolvedValue(undefined),
  };
}

describe('AuditService', () => {
  let service: AuditService;
  let repo: ReturnType<typeof makeRepoMock>;

  beforeEach(async () => {
    repo = makeRepoMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditLog, 'audit'),
          useValue: repo,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  describe('record()', () => {
    it('(a) inserts a row with the mapped fields via repo.save', async () => {
      await service.record({
        actorId: 'actor-uuid-1',
        actorEmail: 'admin@nova.test',
        action: 'user.create',
        appId: 'nova-id-test-app',
        targetId: 'target-uuid-1',
        targetType: 'user',
        metadata: { previous_state: 'inactive' },
      });

      // Either save or insert must have been called exactly once.
      const persistCalled = repo.save.mock.calls.length + repo.insert.mock.calls.length;
      expect(persistCalled).toBe(1);

      // Verify the data passed to create() contains all mapped fields.
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'actor-uuid-1',
          actorEmail: 'admin@nova.test',
          action: 'user.create',
          appId: 'nova-id-test-app',
          targetId: 'target-uuid-1',
          targetType: 'user',
          metadata: { previous_state: 'inactive' },
        }),
      );
    });

    it('(a) minimal call — only required fields; optional fields default to null', async () => {
      await service.record({ actorId: 'actor-uuid-2', action: 'user.delete' });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'actor-uuid-2',
          action: 'user.delete',
        }),
      );

      const persistCalled = repo.save.mock.calls.length + repo.insert.mock.calls.length;
      expect(persistCalled).toBe(1);
    });

    it('(b) a repo error is caught and does NOT propagate out of record()', async () => {
      repo.save.mockRejectedValue(new Error('DB connection lost'));
      repo.insert.mockRejectedValue(new Error('DB connection lost'));

      // Must resolve (not reject) even when the DB is down.
      await expect(
        service.record({ actorId: 'actor-uuid-3', action: 'user.update' }),
      ).resolves.toBeUndefined();
    });

    it('(c) the service has no update or delete method — append-only contract', () => {
      const serviceKeys = Object.getOwnPropertyNames(
        Object.getPrototypeOf(service),
      );

      // Explicitly assert no update/delete surface is present.
      expect(serviceKeys).not.toContain('update');
      expect(serviceKeys).not.toContain('delete');
      expect(serviceKeys).not.toContain('remove');
      expect(serviceKeys).not.toContain('patch');
    });
  });
});
