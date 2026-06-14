import { Test } from '@nestjs/testing';
import { AdminUsersController } from './admin-users.controller';
import { KratosAdminService } from '../ory/kratos-admin.service';
import { PlatformManageUsersGuard } from '../guards/platform-manage-users.guard';

describe('AdminUsersController', () => {
  let controller: AdminUsersController;
  const kratos = {
    listIdentities: jest.fn(),
    getIdentity: jest.fn(),
    createIdentity: jest.fn(),
    updateIdentity: jest.fn(),
    setIdentityState: jest.fn(),
    deleteIdentity: jest.fn(),
    createRecoveryLink: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      controllers: [AdminUsersController],
      providers: [{ provide: KratosAdminService, useValue: kratos }],
    })
      .overrideGuard(PlatformManageUsersGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = mod.get(AdminUsersController);
  });

  it('GET list maps identities to UserResponseDto', async () => {
    kratos.listIdentities.mockResolvedValue([
      { id: '1', traits: { email: 'a@b.c', full_name: 'A' }, metadata_public: { role: 'platform_user' }, state: 'active', created_at: 't' },
    ]);
    const res = await controller.list({ pageSize: 50 });
    expect(res[0]).toMatchObject({ id: '1', email: 'a@b.c', fullName: 'A', role: 'platform_user' });
  });

  it('POST create delegates to KratosAdminService.createIdentity', async () => {
    kratos.createIdentity.mockResolvedValue({ id: 'new', traits: { email: 'n@b.c', full_name: 'N' }, metadata_public: {}, state: 'active', created_at: 't' });
    await controller.create({ email: 'n@b.c', fullName: 'N', password: 'Cacpac2323$' } as any);
    expect(kratos.createIdentity).toHaveBeenCalledWith(expect.objectContaining({ email: 'n@b.c', fullName: 'N' }));
  });

  it('DELETE delegates to deleteIdentity', async () => {
    kratos.deleteIdentity.mockResolvedValue(undefined);
    await controller.remove('id-9');
    expect(kratos.deleteIdentity).toHaveBeenCalledWith('id-9');
  });
});
